param([switch]$NoRun)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# 1) crear venv si no existe
if (-not (Test-Path ".venv")) {
  py -m venv .venv
}

# 2) activar venv
. .\.venv\Scripts\Activate.ps1

# 3) pip up & deps
python -m pip install --upgrade pip
pip install -r requirements.txt

# 4) seed de .env si no existe
if (-not (Test-Path ".env")) { Copy-Item .env.example .env }

# 5) levantar API (omitible con -NoRun)
if (-not $NoRun) {
  uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
}
