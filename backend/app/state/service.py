import json
from datetime import datetime, timezone
from typing import Any
from fastapi import HTTPException
from sqlalchemy.orm import Session
from ..core.database import UserState

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
    for key in base:
        if key in raw:
            base[key] = raw[key]
    base.pop("users", None)
    base.pop("currentUserId", None)
    base.pop("ownerId", None)
    return base

def read_user_state(session: Session, user_id: str) -> dict[str, Any]:
    row = session.get(UserState, user_id)
    if not row:
        state = blank_state()
        session.add(UserState(user_id=user_id, state_json=json.dumps(state, ensure_ascii=False), updated_at=datetime.now(timezone.utc)))
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
