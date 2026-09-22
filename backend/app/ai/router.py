import json, os, time
from collections import defaultdict, deque
from typing import Literal
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from ..core.database import User
from ..core.security import current_user

router = APIRouter(prefix="/ai", tags=["ai"])

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
    def trim_text(cls, value: str) -> str: return value.strip()

SYSTEM_PROMPT = """You create educational workout-plan suggestions. Return ONLY valid JSON with this shape:
{"name":"string","description":"string","level":"Iniciante|Intermediário|Avançado|Personalizado","groups":[{"name":"string","exercises":[{"name":"string","equipment":"string","seriesCount":3,"sets":[{"reps":"8-12"}]}]}],"notes":["string"]}
Use 1-12 groups, 1-16 exercises per group, and 1-12 sets per exercise. Sets must match seriesCount. Write every visible value in Brazilian Portuguese. Do not prescribe medical treatment, diagnose injuries, or claim guaranteed results. Include a brief educational-safety note in notes. Avoid unsupported or unsafe exercises when limitations are supplied."""

def prompt_for(data: PlanRequest) -> str:
    return f"""{SYSTEM_PROMPT}\n\nCreate a plan using this user profile:\n- Objetivo: {data.objective}\n- Nível: {data.level}\n- Dias por semana: {data.daysPerWeek}\n- Duração por treino: {data.durationMinutes} minutos\n- Equipamentos: {data.equipment or 'não informado'}\n- Limitações/observações: {data.limitations or 'não informado'}\n- Preferência de divisão: {data.splitPreference or 'sem preferência'}\n"""

def parse_json(text: str) -> dict:
    try: value = json.loads(text)
    except json.JSONDecodeError as exc: raise HTTPException(502, "O provedor de IA retornou um formato inválido.") from exc
    if not isinstance(value, dict): raise HTTPException(502, "O provedor de IA retornou um plano inválido.")
    return value

async def generate_with_openai(prompt: str) -> dict:
    key = os.getenv("OPENAI_API_KEY", "")
    if not key: raise HTTPException(503, "OPENAI_API_KEY não configurada no servidor.")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    payload = {"model": model, "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_object"}, "temperature": 0.4}
    async with httpx.AsyncClient(timeout=60) as client: response = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers={"Authorization": f"Bearer {key}"})
    if response.status_code >= 400: raise HTTPException(502, "Não foi possível gerar o plano com a IA.")
    try: text = response.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc: raise HTTPException(502, "O provedor de IA não retornou um plano utilizável.") from exc
    return parse_json(text)

async def generate_with_gemini(prompt: str) -> dict:
    key = os.getenv("GEMINI_API_KEY", "")
    if not key: raise HTTPException(503, "GEMINI_API_KEY não configurada no servidor.")
    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json", "temperature": 0.4}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    async with httpx.AsyncClient(timeout=60) as client: response = await client.post(url, json=payload)
    if response.status_code >= 400: raise HTTPException(502, "Não foi possível gerar o plano com a IA.")
    try: text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as exc: raise HTTPException(502, "O provedor de IA não retornou um plano utilizável.") from exc
    return parse_json(text)

REQUESTS: dict[str, deque[float]] = defaultdict(deque)
RATE_LIMIT, RATE_WINDOW_SECONDS = 10, 60

def enforce_rate_limit(request: Request) -> None:
    address = request.client.host if request.client else "unknown"; now = time.monotonic(); bucket = REQUESTS[address]
    while bucket and now - bucket[0] > RATE_WINDOW_SECONDS: bucket.popleft()
    if len(bucket) >= RATE_LIMIT: raise HTTPException(429, "Muitas solicitações. Aguarde um minuto e tente novamente.")
    bucket.append(now)

@router.post("/plan")
async def create_plan(data: PlanRequest, request: Request, user: User = Depends(current_user)):
    enforce_rate_limit(request)
    provider = os.getenv("AI_PROVIDER", "gemini").strip().lower(); prompt = prompt_for(data)
    if provider == "openai": return await generate_with_openai(prompt)
    if provider == "gemini": return await generate_with_gemini(prompt)
    raise HTTPException(503, "AI_PROVIDER deve ser 'gemini' ou 'openai'.")
