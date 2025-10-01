import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no definido. Crea .env basado en .env.example")

# Crear engine SQLAlchemy
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

def quick_ping():
    """Consulta sencilla para verificar la conexión."""
    with engine.connect() as conn:
        row = conn.execute(
            text("select now() as server_time, current_database() as db, version() as pg_version")
        ).mappings().first()
        return dict(row)
