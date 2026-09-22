from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import ALLOWED_ORIGINS
from .auth.router import router as auth_router
from .state.router import router as state_router
from .workouts.router import router as workouts_router
from .ai.router import router as ai_router
from .health.router import router as health_router

app = FastAPI(title="Meu Treino API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=False, allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers=["Authorization", "Content-Type"])
app.include_router(auth_router)
app.include_router(state_router)
app.include_router(workouts_router)
app.include_router(ai_router)
app.include_router(health_router)
