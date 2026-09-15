"""Backend for Meu Treino.

Provides AI planning plus multi-user authentication and per-user state storage.
The PWA is hosted separately (for example on GitHub Pages). Authentication,
authorization and the persistent source of truth for user data live here.
"""
import hashlib
import hmac
import json
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


async def generate_with_openai(prompt: str) -> dict:
    key = os.getenv("OPENAI_API_KEY", "")
    if not key:
        raise HTTPException(503, "OPENAI_API_KEY não configurada no servidor.")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_object"}, "temperature": 0.4}
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers={"Authorization": f"Bearer {key}"})
    if response.status_code >= 400:
        raise HTTPException(502, "Não foi possível gerar o plano com a IA.")
    result = response.json()
    try:
        text = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(502, "O provedor de IA não retornou um plano utilizável.") from exc
    return parse_json(text)


async def generate_with_gemini(prompt: str) -> dict:
    key = os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise HTTPException(503, "GEMINI_API_KEY não configurada no servidor.")
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json", "temperature": 0.4}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(url, json=payload)
    if response.status_code >= 400:
        raise HTTPException(502, "Não foi possível gerar o plano com a IA.")
    result = response.json()
    try:
        text = result["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as exc:
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


@app.post("/ai/plan")
async def create_plan(data: PlanRequest, request: Request, user: User = Depends(current_user)) -> dict:
    enforce_rate_limit(request)
    provider = os.getenv("AI_PROVIDER", "gemini").strip().lower()
    prompt = prompt_for(data)
    if provider == "openai":
        return await generate_with_openai(prompt)
    if provider == "gemini":
        return await generate_with_gemini(prompt)
    raise HTTPException(503, "AI_PROVIDER deve ser 'gemini' ou 'openai'.")
