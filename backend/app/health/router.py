from fastapi import APIRouter
from sqlalchemy import select
from ..core.database import SessionLocal

router = APIRouter(tags=["health"])

@router.get("/")
def root():
    return {"app": "Meu Treino API", "status": "online"}

@router.get("/health")
def health():
    with SessionLocal() as session:
        session.execute(select(1))
    from ..core.config import AI_PROVIDER
    return {"status": "ok", "provider": AI_PROVIDER, "database": "ok"}
