#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

# 1) crear venv si no existe
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

# 2) activar venv
# shellcheck disable=SC1091
source .venv/bin/activate

# 3) pip up & deps
python -m pip install --upgrade pip
pip install -r requirements.txt

# 4) seed de .env si no existe
[ -f .env ] || cp .env.example .env

# 5) levantar API
exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
