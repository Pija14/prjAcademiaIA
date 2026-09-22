from typing import Any
from fastapi import APIRouter, Depends
from ..core.database import SessionLocal, User
from ..core.security import current_user
from .service import read_user_state, write_user_state

router = APIRouter(tags=["state"])

@router.get("/state")
def get_state(user: User = Depends(current_user)):
    with SessionLocal() as session: return read_user_state(session, user.id)

@router.put("/state")
def put_state(state: dict[str, Any], user: User = Depends(current_user)):
    with SessionLocal() as session: return write_user_state(session, user.id, state)
