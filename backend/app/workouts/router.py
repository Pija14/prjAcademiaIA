from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import SessionLocal, User
from ..core.security import current_user, new_id
from ..state.service import read_user_state, write_user_state

router = APIRouter(prefix="/workouts", tags=["workouts"])

@router.get("")
def list_workouts(user: User = Depends(current_user)):
    with SessionLocal() as session: return read_user_state(session, user.id).get("myWorkouts", [])

@router.get("/{workout_id}")
def get_workout(workout_id: str, user: User = Depends(current_user)):
    with SessionLocal() as session: workouts = read_user_state(session, user.id).get("myWorkouts", [])
    for workout in workouts:
        if str(workout.get("id")) == workout_id: return workout
    raise HTTPException(404, "Treino não encontrado para o usuário autenticado.")

@router.post("")
def create_workout(workout: dict[str, Any], user: User = Depends(current_user)):
    clean = dict(workout); clean["userId"] = user.id
    if not clean.get("id"): clean["id"] = new_id("treino")
    with SessionLocal() as session:
        state = read_user_state(session, user.id); state.setdefault("myWorkouts", []).append(clean); write_user_state(session, user.id, state)
    return clean

@router.put("/{workout_id}")
def update_workout(workout_id: str, workout: dict[str, Any], user: User = Depends(current_user)):
    with SessionLocal() as session:
        state = read_user_state(session, user.id); workouts = state.setdefault("myWorkouts", [])
        for index, current in enumerate(workouts):
            if str(current.get("id")) == workout_id:
                clean = dict(workout); clean["id"] = workout_id; clean["userId"] = user.id; workouts[index] = clean; write_user_state(session, user.id, state); return clean
    raise HTTPException(404, "Treino não encontrado para o usuário autenticado.")

@router.delete("/{workout_id}")
def delete_workout(workout_id: str, user: User = Depends(current_user)):
    with SessionLocal() as session:
        state = read_user_state(session, user.id); workouts = state.setdefault("myWorkouts", []); original = len(workouts)
        state["myWorkouts"] = [w for w in workouts if str(w.get("id")) != workout_id]
        if len(state["myWorkouts"]) == original: raise HTTPException(404, "Treino não encontrado para o usuário autenticado.")
        write_user_state(session, user.id, state)
    return {"status": "ok"}
