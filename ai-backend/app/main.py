"""Secure, deployable backend for Meu Treino's optional AI planner.

Keep this service separate from GitHub Pages. API keys stay in environment
variables configured by the host, never in the PWA.
"""
import json
import os
import time
from collections import defaultdict, deque
from typing import Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

load_dotenv()

app = FastAPI(title="Meu Treino AI Planner", version="1.0.0")
origins = [item.strip() for item in os.getenv("ALLOWED_ORIGINS", "").split(",") if item.strip()]
if not origins:
    origins = ["http://localhost:8000", "http://127.0.0.1:8000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

# A lightweight safeguard for a single-instance deployment. Use a platform
# rate-limit product for production deployments with multiple instances.
REQUESTS: dict[str, deque[float]] = defaultdict(deque)
RATE_LIMIT = 10
RATE_WINDOW_SECONDS = 60


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
    return f"""{SYSTEM_PROMPT}

Create a plan using this user profile:
- Objetivo: {data.objective}
- Nível: {data.level}
- Dias por semana: {data.daysPerWeek}
- Duração por treino: {data.durationMinutes} minutos
- Equipamentos: {data.equipment or 'não informado'}
- Limitações/observações: {data.limitations or 'não informado'}
- Preferência de divisão: {data.splitPreference or 'sem preferência'}
"""


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
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
        "temperature": 0.4,
    }
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
def health() -> dict:
    return {"status": "ok", "provider": os.getenv("AI_PROVIDER", "gemini")}


@app.post("/ai/plan")
async def create_plan(data: PlanRequest, request: Request) -> dict:
    enforce_rate_limit(request)
    provider = os.getenv("AI_PROVIDER", "gemini").strip().lower()
    prompt = prompt_for(data)
    if provider == "openai":
        return await generate_with_openai(prompt)
    if provider == "gemini":
        return await generate_with_gemini(prompt)
    raise HTTPException(503, "AI_PROVIDER deve ser 'gemini' ou 'openai'.")
