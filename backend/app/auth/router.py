import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from ..core.database import SessionLocal, User, UserState
from ..core.security import current_user, create_access_token, hash_password, normalize_email, new_id, require_jwt_secret, verify_password
from ..state.service import blank_state, read_user_state

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=320)
    password: str = Field(min_length=6, max_length=128)
    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str: return value.strip()
    @field_validator("email")
    @classmethod
    def normalize_mail(cls, value: str) -> str: return normalize_email(value)

class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=320)
    password: str = Field(min_length=1, max_length=128)
    @field_validator("email")
    @classmethod
    def normalize_mail(cls, value: str) -> str: return normalize_email(value)

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    createdAt: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    state: dict

def user_response(user: User) -> UserResponse:
    created = user.created_at
    if created.tzinfo is None: created = created.replace(tzinfo=timezone.utc)
    return UserResponse(id=user.id, name=user.name, email=user.email, createdAt=created.isoformat())

@router.post("/register", response_model=AuthResponse)
def register(data: RegisterRequest):
    require_jwt_secret()
    with SessionLocal() as session:
        if session.scalar(select(User).where(User.email == data.email)):
            raise HTTPException(409, "Este e-mail já está cadastrado.")
        user = User(id=new_id("user"), name=data.name, email=data.email, password_hash=hash_password(data.password), created_at=datetime.now(timezone.utc))
        session.add(user)
        session.add(UserState(user_id=user.id, state_json=json.dumps(blank_state(), ensure_ascii=False), updated_at=datetime.now(timezone.utc)))
        session.commit()
        return AuthResponse(access_token=create_access_token(user.id), user=user_response(user), state=blank_state())

@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest):
    require_jwt_secret()
    with SessionLocal() as session:
        user = session.scalar(select(User).where(User.email == data.email))
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(401, "E-mail ou senha inválidos.")
        return AuthResponse(access_token=create_access_token(user.id), user=user_response(user), state=read_user_state(session, user.id))

@router.post("/logout")
def logout(user: User = Depends(current_user)): return {"status": "ok"}

@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(current_user)): return user_response(user)
