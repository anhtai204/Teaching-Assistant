import os
import sys
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", message="The default value of `allowed_objects` will change")

logger = logging.getLogger(__name__)

# Thêm thư mục gốc (backend) vào sys.path để các import 'src.xxx' hoạt động
current_dir = os.path.dirname(os.path.abspath(__file__)) # backend/src/app
backend_root = os.path.abspath(os.path.join(current_dir, "..", ".."))

if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

# Import trực tiếp để nếu có lỗi bên trong routes.py thì nó sẽ hiện ra rõ ràng
from src.app.routes import router
from src.app.moderation_routes import router as moderation_router
from src.app.analytics_routes import router as analytics_router
from src.database import SessionLocal, engine, Base
from src.models import User

import bcrypt

# Triggering reload to pick up schema changes
app = FastAPI(title="AI Teaching Assistant API")

# Enable CORS — only allow trusted origins
# Add more origins to ALLOWED_ORIGINS env var (comma-separated) for production.
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "AI Teaching Assistant API is running",
        "version": "1.0.1"
    }

app.include_router(router)
app.include_router(moderation_router)
app.include_router(analytics_router)
app.mount('/data', StaticFiles(directory='data'), name='data')

@app.on_event("startup")
async def startup_event():
    # Security check — warn loudly if auth key is missing
    if not os.getenv("INTERNAL_API_KEY"):
        logger.warning(
            "⚠️  INTERNAL_API_KEY is not set in environment variables. "
            "All protected API endpoints will return 503. "
            "Set INTERNAL_API_KEY in your .env file."
        )

    # Ensure tables are created
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            # Read credentials from env — never hardcode passwords
            lecturer_email = os.getenv("DEFAULT_LECTURER_EMAIL", "lecturer@university.edu")
            lecturer_pw = os.getenv("DEFAULT_LECTURER_PASSWORD", "")
            student_email = os.getenv("DEFAULT_STUDENT_EMAIL", "student@university.edu")
            student_pw = os.getenv("DEFAULT_STUDENT_PASSWORD", "")

            if not lecturer_pw or not student_pw:
                logger.warning(
                    "⚠️  DEFAULT_LECTURER_PASSWORD / DEFAULT_STUDENT_PASSWORD not set. "
                    "Skipping default account creation. Set them in .env to seed the DB."
                )
            else:
                salt_lec = bcrypt.gensalt()
                hashed_pw_lec = bcrypt.hashpw(lecturer_pw.encode("utf-8"), salt_lec).decode("utf-8")
                db.add(User(
                    email=lecturer_email,
                    password_hash=hashed_pw_lec,
                    full_name="Default Lecturer",
                    role="lecturer",
                ))

                salt_stu = bcrypt.gensalt()
                hashed_pw_stu = bcrypt.hashpw(student_pw.encode("utf-8"), salt_stu).decode("utf-8")
                db.add(User(
                    email=student_email,
                    password_hash=hashed_pw_stu,
                    full_name="Default Student",
                    role="student",
                ))

                db.commit()
                logger.info("✅ Default accounts created: %s, %s", lecturer_email, student_email)
    except Exception as e:
        logger.error("❌ Error during initialization: %s", e)
    finally:
        db.close()
