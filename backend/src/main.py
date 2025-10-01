from fastapi import FastAPI, Header, HTTPException
import requests
from jose import jwt

# Importa tu función de ping a la base
from .db import quick_ping

# FastAPI app
app = FastAPI(title="Planta Backend")

# ==========================
# Configuración Supabase JWT
# ==========================

PROJECT_REF = "zgodzbybnfusfwxkjmuw"  # tu Project Ref real
JWKS_URL = f"https://{PROJECT_REF}.supabase.co/auth/v1/jwks"

# Cacheamos las claves públicas de Supabase
_jwks = requests.get(JWKS_URL, timeout=5).json()

def verify_supabase_jwt(token: str):
    """
    Verifica un token JWT emitido por Supabase Auth.
    Lanza HTTPException si no es válido.
    """
    try:
        header = jwt.get_unverified_header(token)
        key = next(k for k in _jwks["keys"] if k["kid"] == header["kid"])
        return jwt.decode(
            token,
            key,
            algorithms=[key["alg"]],
            audience="authenticated"  # 👈 importante: audiencia esperada
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token inválido: {e}")

# ==========================
# Endpoints
# ==========================

@app.get("/health")
def health():
    """Simple health check."""
    return {"status": "ok"}

@app.get("/db-ping")
def db_ping():
    """Prueba conexión a Postgres."""
    info = quick_ping()
    return {"ok": True, "info": info}

@app.get("/api/secure-ping")
def secure_ping(authorization: str = Header(...)):
    """
    Endpoint protegido: requiere Bearer token válido de Supabase Auth.
    """
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Falta Bearer token")

    token = authorization.split()[1]
    claims = verify_supabase_jwt(token)

    return {"ok": True, "user_id": claims.get("sub")}
