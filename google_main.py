"""Google authentication adapter for Meu Treino.

Keeps the existing main.py authentication untouched while exposing the minimum
Google login endpoints needed by the login screen. The Google ID token is
validated server-side before an existing or new local account is authenticated.
"""
import os

from fastapi import HTTPException
from pydantic import BaseModel, Field
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

import main as base

app = base.app

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", os.getenv("GOOGLE_WEB_CLIENT_ID", "")).strip()


class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=20)


@app.get("/auth/google/config")
def google_config() -> dict[str, str | bool]:
    return {"enabled": bool(GOOGLE_CLIENT_ID), "client_id": GOOGLE_CLIENT_ID}


@app.post("/auth/google", response_model=base.AuthResponse)
def google_login(data: GoogleLoginRequest) -> base.AuthResponse:
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(503, "GOOGLE_CLIENT_ID não configurado no servidor.")

    try:
        idinfo = id_token.verify_oauth2_token(
            data.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise HTTPException(401, "Credencial do Google inválida ou expirada.") from exc

    issuer = str(idinfo.get("iss") or "")
    email = base.normalize_email(str(idinfo.get("email") or ""))
    subject = str(idinfo.get("sub") or "")
    name = str(idinfo.get("name") or "").strip()
    email_verified = bool(idinfo.get("email_verified"))

    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(401, "Emissor da credencial do Google inválido.")
    if not subject or not email or not email_verified:
        raise HTTPException(401, "A conta do Google não forneceu os dados de identificação necessários.")

    with base.SessionLocal() as session:
        user = session.scalar(base.select(base.User).where(base.User.email == email))

        if not user:
            user = base.User(
                id=base.new_id("user"),
                name=name or email.split("@", 1)[0],
                email=email,
                # Google-authenticated users do not use a local password.
                password_hash=base.hash_password(base.secrets.token_urlsafe(32)),
                created_at=base.datetime.now(base.timezone.utc),
            )
            session.add(user)
            session.add(
                base.UserState(
                    user_id=user.id,
                    state_json=base.json.dumps(base.blank_state(), ensure_ascii=False),
                    updated_at=base.datetime.now(base.timezone.utc),
                )
            )
            session.commit()
        else:
            # Keep the existing account and its persistent workout state.
            if name and not user.name:
                user.name = name
                session.commit()

        state = base.read_user_state(session, user.id)
        return base.AuthResponse(
            access_token=base.create_access_token(user.id),
            user=base.user_response(user),
            state=state,
        )
