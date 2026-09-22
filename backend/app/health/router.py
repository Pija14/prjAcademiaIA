from fastapi import APIRouter, Depends
from sqlalchemy import select
from ..core.database import SessionLocal
from ..core.security import current_user

router = APIRouter(tags=["health"])

@router.get("/health")
def health():
    with SessionLocal() as session: session.execute(select(1))
    from ..core.config import AI_PROVIDER
    return {"status": "ok", "provider": AI_PROVIDER, "database": "ok"}
