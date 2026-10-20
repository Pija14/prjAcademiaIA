"""Backend for Meu Treino.

Provides AI planning plus multi-user authentication and per-user state storage.
The PWA is hosted separately (for example on GitHub Pages). Authentication,
authorization and the persistent source of truth for user data live here.
"""
import hashlib
import hmac
import base64
import binascii
import json
import logging
import os
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import httpx
import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

load_dotenv()

app = FastAPI(title="Meu Treino API", version="2.0.0")
origins = [item.strip() for item in os.getenv("ALLOWED_ORIGINS", "").split(",") if item.strip()]
if not origins:
    origins = ["http://localhost:8000", "http://127.0.0.1:8000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# -----------------------------
# Database
# -----------------------------
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    if APP_ENV == "production":
        raise RuntimeError("DATABASE_URL é obrigatório em produção.")
    DATABASE_URL = "sqlite:///./meu_treino.db"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgres://") :]
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgresql://") :]

engine_kwargs: dict[str, Any] = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
engine = create_engine(DATABASE_URL, **engine_kwargs)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class UserState(Base):
    __tablename__ = "user_states"
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    state_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

# -----------------------------
# Authentication
# -----------------------------
JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))
security = HTTPBearer(auto_error=False)


def require_jwt_secret() -> None:
    if not JWT_SECRET or len(JWT_SECRET) < 32:
        raise HTTPException(503, "JWT_SECRET não configurado corretamente no servidor.")


def normalize_email(value: str) -> str:
    return value.strip().lower()


def new_id(prefix: str) -> str:
    return f"{prefix}-{secrets.token_urlsafe(18)}"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return "scrypt$16384$8$1$" + salt.hex() + "$" + derived.hex()


def verify_password(password: str, encoded: str) -> bool:
    try:
        prefix, salt_hex, hash_hex = encoded.rsplit("$", 2)
        _, n, r, p = prefix.split("$")
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
        actual = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=int(n), r=int(r), p=int(p))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: str) -> str:
    require_jwt_secret()
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "iat": int(now.timestamp()), "exp": now + timedelta(minutes=ACCESS_TOKEN_MINUTES)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> User:
    require_jwt_secret()
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Autenticação necessária.")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = str(payload.get("sub") or "")
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão inválida ou expirada.") from exc
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão inválida.")
    with SessionLocal() as session:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuário não encontrado.")
        return user


# -----------------------------
# Auth models
# -----------------------------
class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=320)
    password: str = Field(min_length=6, max_length=128)

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        return value.strip()

    @field_validator("email")
    @classmethod
    def normalize_mail(cls, value: str) -> str:
        return normalize_email(value)


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=320)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_mail(cls, value: str) -> str:
        return normalize_email(value)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    createdAt: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    state: dict[str, Any]


def user_response(user: User) -> UserResponse:
    created = user.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return UserResponse(id=user.id, name=user.name, email=user.email, createdAt=created.isoformat())


# -----------------------------
# User state
# -----------------------------
def blank_state() -> dict[str, Any]:
    return {
        "workouts": [],
        "settings": {"rest": 30, "exerciseDuration": 60, "restDuration": 30, "weeklyGoal": 4, "sound": True, "vibration": True, "theme": "light"},
        "excludedExercises": {"A": [], "B": [], "C": []},
        "customExercises": {"A": [], "B": [], "C": []},
        "workoutPlans": {"A": None, "B": None, "C": None},
        "workoutNames": {"A": "Treino A", "B": "Treino B", "C": "Treino C"},
        "myWorkouts": [],
        "workoutHistory": [],
    }


def sanitize_state(raw: dict[str, Any] | None) -> dict[str, Any]:
    base = blank_state()
    if not isinstance(raw, dict):
        return base
    allowed = set(base)
    for key in allowed:
        if key in raw:
            base[key] = raw[key]
    # These fields must never be client-controlled as part of persistent user state.
    base.pop("users", None)
    base.pop("currentUserId", None)
    base.pop("ownerId", None)
    return base


def read_user_state(session: Session, user_id: str) -> dict[str, Any]:
    row = session.get(UserState, user_id)
    if not row:
        state = blank_state()
        row = UserState(user_id=user_id, state_json=json.dumps(state, ensure_ascii=False), updated_at=datetime.now(timezone.utc))
        session.add(row)
        session.commit()
        return state
    try:
        return sanitize_state(json.loads(row.state_json))
    except json.JSONDecodeError:
        return blank_state()


def write_user_state(session: Session, user_id: str, state: dict[str, Any]) -> dict[str, Any]:
    clean = sanitize_state(state)
    payload = json.dumps(clean, ensure_ascii=False, separators=(",", ":"))
    if len(payload.encode("utf-8")) > 5_000_000:
        raise HTTPException(413, "Os dados do usuário excedem o limite permitido.")
    row = session.get(UserState, user_id)
    now = datetime.now(timezone.utc)
    if row:
        row.state_json = payload
        row.updated_at = now
    else:
        session.add(UserState(user_id=user_id, state_json=payload, updated_at=now))
    session.commit()
    return clean


# -----------------------------
# Auth endpoints
# -----------------------------
@app.post("/auth/register", response_model=AuthResponse)
def register(data: RegisterRequest) -> AuthResponse:
    require_jwt_secret()
    with SessionLocal() as session:
        if session.scalar(select(User).where(User.email == data.email)):
            raise HTTPException(409, "Este e-mail já está cadastrado.")
        user = User(
            id=new_id("user"),
            name=data.name,
            email=data.email,
            password_hash=hash_password(data.password),
            created_at=datetime.now(timezone.utc),
        )
        session.add(user)
        session.add(UserState(user_id=user.id, state_json=json.dumps(blank_state(), ensure_ascii=False), updated_at=datetime.now(timezone.utc)))
        session.commit()
        return AuthResponse(access_token=create_access_token(user.id), user=user_response(user), state=blank_state())


@app.post("/auth/login", response_model=AuthResponse)
def login(data: LoginRequest) -> AuthResponse:
    require_jwt_secret()
    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == data.email))
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(401, "E-mail ou senha inválidos.")
        state = read_user_state(session, user.id)
        return AuthResponse(access_token=create_access_token(user.id), user=user_response(user), state=state)


@app.post("/auth/logout")
def logout(user: User = Depends(current_user)) -> dict[str, str]:
    # Access tokens are short-lived/stateless. The frontend removes its token;
    # this endpoint exists for a consistent client flow and future token revocation.
    return {"status": "ok"}


@app.get("/auth/me", response_model=UserResponse)
def me(user: User = Depends(current_user)) -> UserResponse:
    return user_response(user)


# -----------------------------
# Google sign-in
# -----------------------------
# The PWA obtains a Google ID token through Google Identity Services and sends it
# here. The token is verified against Google's public keys before any account is
# created or authenticated; the frontend never decides who the user is.
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}
google_jwks = jwt.PyJWKClient("https://www.googleapis.com/oauth2/v3/certs", cache_keys=True, lifespan=3600, timeout=10)


class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=20, max_length=4096)


def verify_google_credential(credential: str) -> dict[str, Any]:
    try:
        signing_key = google_jwks.get_signing_key_from_jwt(credential)
        claims = jwt.decode(
            credential,
            signing_key.key,
            algorithms=["RS256"],
            audience=GOOGLE_CLIENT_ID,
            options={"require": ["iss", "aud", "sub", "exp", "iat"]},
            leeway=30,
        )
    except jwt.PyJWKClientConnectionError as exc:
        raise HTTPException(503, "Não foi possível validar o login com o Google agora. Tente novamente.") from exc
    except (jwt.PyJWTError, jwt.PyJWKClientError) as exc:
        raise HTTPException(401, "Credencial do Google inválida ou expirada.") from exc
    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise HTTPException(401, "Emissor da credencial do Google inválido.")
    if not claims.get("email") or claims.get("email_verified") is not True:
        raise HTTPException(401, "Sua conta do Google precisa ter um e-mail verificado.")
    return claims


@app.get("/auth/google/config")
def google_config() -> dict[str, Any]:
    # The client ID is public by design; it identifies the app to Google.
    return {"enabled": bool(GOOGLE_CLIENT_ID), "client_id": GOOGLE_CLIENT_ID}


@app.post("/auth/google", response_model=AuthResponse)
def google_login(data: GoogleLoginRequest) -> AuthResponse:
    require_jwt_secret()
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Login com Google não está configurado no servidor.")
    claims = verify_google_credential(data.credential)
    email = normalize_email(str(claims["email"]))
    name = str(claims.get("name") or "").strip()[:120] or email.split("@", 1)[0]
    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == email))
        if not user:
            now = datetime.now(timezone.utc)
            user = User(
                id=new_id("user"),
                name=name,
                email=email,
                # Google accounts have no local password; this random hash can never be matched.
                password_hash=hash_password(secrets.token_urlsafe(32)),
                created_at=now,
            )
            session.add(user)
            session.add(UserState(user_id=user.id, state_json=json.dumps(blank_state(), ensure_ascii=False), updated_at=now))
            session.commit()
        state = read_user_state(session, user.id)
        return AuthResponse(access_token=create_access_token(user.id), user=user_response(user), state=state)


@app.get("/state")
def get_state(user: User = Depends(current_user)) -> dict[str, Any]:
    with SessionLocal() as session:
        return read_user_state(session, user.id)


@app.put("/state")
def put_state(state: dict[str, Any], user: User = Depends(current_user)) -> dict[str, Any]:
    with SessionLocal() as session:
        return write_user_state(session, user.id, state)


# Resource-level endpoints provide defense in depth and a path to migrate the
# JSON state into normalized relational tables later without changing auth.
@app.get("/workouts")
def list_workouts(user: User = Depends(current_user)) -> list[dict[str, Any]]:
    with SessionLocal() as session:
        return read_user_state(session, user.id).get("myWorkouts", [])


@app.get("/workouts/{workout_id}")
def get_workout(workout_id: str, user: User = Depends(current_user)) -> dict[str, Any]:
    with SessionLocal() as session:
        workouts = read_user_state(session, user.id).get("myWorkouts", [])
    for workout in workouts:
        if str(workout.get("id")) == workout_id:
            return workout
    raise HTTPException(404, "Treino não encontrado para o usuário autenticado.")


@app.post("/workouts")
def create_workout(workout: dict[str, Any], user: User = Depends(current_user)) -> dict[str, Any]:
    clean = dict(workout)
    clean["userId"] = user.id
    if not clean.get("id"):
        clean["id"] = new_id("treino")
    with SessionLocal() as session:
        state = read_user_state(session, user.id)
        workouts = state.setdefault("myWorkouts", [])
        workouts.append(clean)
        write_user_state(session, user.id, state)
    return clean


@app.put("/workouts/{workout_id}")
def update_workout(workout_id: str, workout: dict[str, Any], user: User = Depends(current_user)) -> dict[str, Any]:
    with SessionLocal() as session:
        state = read_user_state(session, user.id)
        workouts = state.setdefault("myWorkouts", [])
        for index, current in enumerate(workouts):
            if str(current.get("id")) == workout_id:
                clean = dict(workout)
                clean["id"] = workout_id
                clean["userId"] = user.id
                workouts[index] = clean
                write_user_state(session, user.id, state)
                return clean
    raise HTTPException(404, "Treino não encontrado para o usuário autenticado.")


@app.delete("/workouts/{workout_id}")
def delete_workout(workout_id: str, user: User = Depends(current_user)) -> dict[str, str]:
    with SessionLocal() as session:
        state = read_user_state(session, user.id)
        workouts = state.setdefault("myWorkouts", [])
        original = len(workouts)
        state["myWorkouts"] = [w for w in workouts if str(w.get("id")) != workout_id]
        if len(state["myWorkouts"]) == original:
            raise HTTPException(404, "Treino não encontrado para o usuário autenticado.")
        write_user_state(session, user.id, state)
    return {"status": "ok"}


# -----------------------------
# AI planner
# -----------------------------
class PlanRequest(BaseModel):
    objective: str = Field(min_length=2, max_length=80)
    level: Literal["Iniciante", "Intermediário", "Avançado"]
    daysPerWeek: int = Field(ge=1, le=7)
    durationMinutes: int = Field(ge=20, le=180)
    equipment: str = Field(default="", max_length=400)
    limitations: str = Field(default="", max_length=600)
    splitPreference: str = Field(default="", max_length=300)

    @field_validator("objective", "equipment", "limitations", "splitPreference")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()


SYSTEM_PROMPT = """You create educational workout-plan suggestions. Return ONLY valid JSON with this shape:
{
  "name": "string", "description": "string", "level": "Iniciante|Intermediário|Avançado|Personalizado",
  "groups": [{"name": "string", "exercises": [{"name": "string", "equipment": "string", "seriesCount": 3, "sets": [{"reps": "8-12"}]}]}],
  "notes": ["string"]
}
Use 1-12 groups, 1-16 exercises per group, and 1-12 sets per exercise. Sets must match seriesCount.
Write every visible value in Brazilian Portuguese. Do not prescribe medical treatment, diagnose injuries, or claim guaranteed results. Include a brief educational-safety note in notes. Avoid unsupported or unsafe exercises when limitations are supplied."""


SHEET_MIME_TYPES = ("image/jpeg", "image/png", "image/webp")
SHEET_MAX_BYTES = 4 * 1024 * 1024  # por imagem, depois de decodificada


class SheetImage(BaseModel):
    mimeType: Literal["image/jpeg", "image/png", "image/webp"]
    data: str = Field(min_length=100, max_length=6_000_000)  # base64 sem o prefixo data:

    @field_validator("data")
    @classmethod
    def valid_base64(cls, value: str) -> str:
        value = value.strip()
        try:
            raw = base64.b64decode(value, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValueError("Imagem inválida.") from exc
        if len(raw) > SHEET_MAX_BYTES:
            raise ValueError("Imagem grande demais (máximo 4 MB).")
        return value


class SheetPlanRequest(BaseModel):
    images: list[SheetImage] = Field(min_length=1, max_length=3)
    notes: str = Field(default="", max_length=400)

    @field_validator("notes")
    @classmethod
    def trim_notes(cls, value: str) -> str:
        return value.strip()


SHEET_PROMPT = """You read photos of a gym workout sheet ("ficha de treino") and transcribe it. Return ONLY valid JSON with this shape:
{
  "name": "string", "description": "string", "level": "Personalizado",
  "groups": [{"name": "string", "exercises": [{"name": "string", "equipment": "string", "seriesCount": 3, "sets": [{"reps": "12", "weight": "20 kg"}]}]}],
  "notes": ["string"]
}
Rules:
- Transcribe faithfully. Do NOT invent, add or replace exercises. Keep the order of the sheet.
- Each training day or letter (Treino A, B, C, Segunda, Superiores...) becomes one group named as in the sheet (e.g. "Treino A").
- "3x12" means seriesCount 3 with reps "12" in each set; "4x10/8/6" means 4 sets with reps per set; "3x30s" keeps "30s"; "até a falha" keeps the text.
- If a load/weight is written, put it in "weight" of each set (e.g. "20 kg"); otherwise use "".
- Rest times, cadence or technique notes go to "notes".
- Use the equipment field only when written or obvious from the exercise name (máquina, halteres, barra, polia, cabo, livre, peso corporal); otherwise "".
- Fix obvious handwriting/spelling mistakes in exercise names, writing them in Brazilian Portuguese as commonly used in Brazilian gyms.
- If something is unreadable, skip only that item and mention it in "notes".
- If the images are not a workout sheet or nothing is readable, return ONLY {"error": "short reason in Brazilian Portuguese"}.
Use 1-12 groups, 1-16 exercises per group, and 1-12 sets per exercise. Sets must match seriesCount. Write every visible value in Brazilian Portuguese. Include a brief note reminding the user to review the transcription."""


def sheet_prompt_for(data: SheetPlanRequest) -> str:
    extra = f"\nUser notes about the sheet: {data.notes}" if data.notes else ""
    return f"{SHEET_PROMPT}\n\nThe user attached {len(data.images)} photo(s) of the sheet.{extra}\n"


def prompt_for(data: PlanRequest) -> str:
    return f"""{SYSTEM_PROMPT}\n\nCreate a plan using this user profile:\n- Objetivo: {data.objective}\n- Nível: {data.level}\n- Dias por semana: {data.daysPerWeek}\n- Duração por treino: {data.durationMinutes} minutos\n- Equipamentos: {data.equipment or 'não informado'}\n- Limitações/observações: {data.limitations or 'não informado'}\n- Preferência de divisão: {data.splitPreference or 'sem preferência'}\n"""


def parse_json(text: str) -> dict:
    try:
        value = json.loads(text)
    except json.JSONDecodeError as exc:
        raise HTTPException(502, "O provedor de IA retornou um formato inválido.") from exc
    if not isinstance(value, dict):
        raise HTTPException(502, "O provedor de IA retornou um plano inválido.")
    return value


async def generate_with_openai(prompt: str, images: list[SheetImage] | None = None) -> dict:
    key = os.getenv("OPENAI_API_KEY", "")
    if not key:
        raise HTTPException(503, "OPENAI_API_KEY não configurada no servidor.")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    content: Any = prompt
    if images:
        content = [{"type": "text", "text": prompt}] + [
            {"type": "image_url", "image_url": {"url": f"data:{img.mimeType};base64,{img.data}"}} for img in images
        ]
    payload = {"model": model, "messages": [{"role": "user", "content": content}], "response_format": {"type": "json_object"}, "temperature": 0.2 if images else 0.4}
    async with httpx.AsyncClient(timeout=90 if images else 60) as client:
        response = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers={"Authorization": f"Bearer {key}"})
    if response.status_code >= 400:
        raise HTTPException(502, "Não foi possível gerar o plano com a IA.")
    result = response.json()
    try:
        text = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(502, "O provedor de IA não retornou um plano utilizável.") from exc
    return parse_json(text)


logger = logging.getLogger("meu_treino.ia")

GEMINI_FALLBACK_MODELS = "gemini-3-flash-preview,gemini-flash-latest"
# Modelo sobrecarregado (429/503), com erro interno (500) ou retirado (404): tenta o próximo da lista.
GEMINI_RETRY_STATUS = {404, 429, 500, 503}
# Tempo máximo por modelo; esgotado, tenta o próximo (o app espera até 90 s com foto).
GEMINI_TIMEOUT_TEXT, GEMINI_TIMEOUT_IMAGE = 30.0, 40.0


def gemini_models() -> list[str]:
    """GEMINI_MODEL primeiro; depois GEMINI_FALLBACK_MODELS (separados por vírgula), sem repetir."""
    names = [os.getenv("GEMINI_MODEL", "").strip()] + os.getenv("GEMINI_FALLBACK_MODELS", GEMINI_FALLBACK_MODELS).split(",")
    return list(dict.fromkeys(name.strip() for name in names if name.strip()))


def gemini_generation_config(model: str, with_images: bool) -> dict:
    config: dict[str, Any] = {"responseMimeType": "application/json", "temperature": 0.2 if with_images else 0.4}
    # Gemini 3: raciocínio "baixo" basta para montar/transcrever a ficha e deixa a resposta ~10x mais rápida.
    if model.startswith("gemini-3"):
        config["thinkingConfig"] = {"thinkingLevel": "low"}
    return config


def gemini_text(result: dict) -> str:
    parts = result["candidates"][0]["content"]["parts"]
    return next(part["text"] for part in parts if part.get("text") and not part.get("thought"))


async def generate_with_gemini(prompt: str, images: list[SheetImage] | None = None) -> dict:
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        raise HTTPException(503, "GEMINI_API_KEY não configurada no servidor.")
    parts: list[dict] = [{"text": prompt}] + [{"inline_data": {"mime_type": img.mimeType, "data": img.data}} for img in images or []]
    # A chave vai no cabeçalho, não na URL, para não aparecer em logs.
    headers = {"x-goog-api-key": key}
    timeout = GEMINI_TIMEOUT_IMAGE if images else GEMINI_TIMEOUT_TEXT
    response, timed_out = None, False
    async with httpx.AsyncClient(timeout=timeout) as client:
        for model in gemini_models():
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            payload = {"contents": [{"parts": parts}], "generationConfig": gemini_generation_config(model, bool(images))}
            try:
                response = await client.post(url, json=payload, headers=headers)
            except httpx.TimeoutException:
                logger.warning("Gemini %s: sem resposta em %ss", model, timeout)
                timed_out, response = True, None
                continue
            except httpx.HTTPError as exc:
                logger.warning("Gemini %s: falha de conexão (%s)", model, type(exc).__name__)
                response = None
                continue
            if response.status_code not in GEMINI_RETRY_STATUS:
                break
            logger.warning("Gemini %s: HTTP %s, tentando o próximo modelo", model, response.status_code)
    if response is None and timed_out:
        raise HTTPException(504, "A IA demorou demais para responder. Tente novamente em instantes.")
    if response is None or response.status_code >= 400:
        raise HTTPException(502, "Não foi possível gerar o plano com a IA. Tente novamente em instantes.")
    try:
        text = gemini_text(response.json())
    except (KeyError, IndexError, TypeError, StopIteration, ValueError) as exc:
        raise HTTPException(502, "O provedor de IA não retornou um plano utilizável.") from exc
    return parse_json(text)


REQUESTS: dict[str, deque[float]] = defaultdict(deque)
RATE_LIMIT = 10
RATE_WINDOW_SECONDS = 60


def enforce_rate_limit(request: Request) -> None:
    address = request.client.host if request.client else "unknown"
    now = time.monotonic()
    bucket = REQUESTS[address]
    while bucket and now - bucket[0] > RATE_WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT:
        raise HTTPException(429, "Muitas solicitações. Aguarde um minuto e tente novamente.")
    bucket.append(now)


@app.get("/health")
def health() -> dict[str, str]:
    with SessionLocal() as session:
        session.execute(select(1))
    return {"status": "ok", "provider": os.getenv("AI_PROVIDER", "gemini"), "database": "ok"}


async def generate_plan(prompt: str, images: list[SheetImage] | None = None) -> dict:
    provider = os.getenv("AI_PROVIDER", "gemini").strip().lower()
    if provider == "openai":
        return await generate_with_openai(prompt, images)
    if provider == "gemini":
        return await generate_with_gemini(prompt, images)
    raise HTTPException(503, "AI_PROVIDER deve ser 'gemini' ou 'openai'.")


@app.post("/ai/plan-from-image")
async def create_plan_from_image(data: SheetPlanRequest, request: Request, user: User = Depends(current_user)) -> dict:
    """Lê a foto da ficha de academia e devolve o plano no mesmo formato de /ai/plan."""
    enforce_rate_limit(request)
    result = await generate_plan(sheet_prompt_for(data), data.images)
    if isinstance(result.get("error"), str) and not result.get("groups"):
        raise HTTPException(422, f"Não consegui ler a ficha: {result['error'][:200]}")
    return result


@app.post("/ai/plan")
async def create_plan(data: PlanRequest, request: Request, user: User = Depends(current_user)) -> dict:
    enforce_rate_limit(request)
    return await generate_plan(prompt_for(data))
