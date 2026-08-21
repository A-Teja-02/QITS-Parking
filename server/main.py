from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from dotenv import load_dotenv
load_dotenv()

from routers import reservations, slots, auth, users

# Import models so tables are registered with Base
from db.models import Employee, OTPVerification, PasswordReset  # noqa: F401
from db import engine, Base

app = FastAPI(
    title="Parking Reservation System",
    description="Internal company parking reservation API",
    version="1.0.0",
)

# Create database tables on startup
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    
    # Auto-migrate: ensure profile_picture_url column exists in the database
    from sqlalchemy.sql import text
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE employees ADD COLUMN profile_picture_url VARCHAR(500) DEFAULT NULL;"))
            conn.commit()
    except Exception:
        pass

# CORS — allow Vite dev server and production domain
allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    allowed_origins = [o.strip() for o in env_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if env_origins else ["*"],
    allow_credentials=True if (env_origins or not os.getenv("RENDER")) else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(reservations.router)
app.include_router(slots.router)

# Mount uploads static directory
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Parking Reservation API"}
