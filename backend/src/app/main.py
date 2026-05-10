import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", message="The default value of `allowed_objects` will change")

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

app = FastAPI(title="AI Teaching Assistant API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if any user exists
        user_count = db.query(User).count()
        if user_count == 0:
            # Create default lecturer
            salt_lec = bcrypt.gensalt()
            hashed_pw_lec = bcrypt.hashpw("lecturer123".encode('utf-8'), salt_lec).decode('utf-8')
            
            default_lecturer = User(
                email="lecturer@university.edu",
                password_hash=hashed_pw_lec,
                full_name="Default Lecturer",
                role="lecturer"
            )
            db.add(default_lecturer)

            # Create default student
            salt_stu = bcrypt.gensalt()
            hashed_pw_stu = bcrypt.hashpw("student123".encode('utf-8'), salt_stu).decode('utf-8')
            
            default_student = User(
                email="student@university.edu",
                password_hash=hashed_pw_stu,
                full_name="Default Student",
                role="student"
            )
            db.add(default_student)
            
            db.commit()
            print("✅ Default accounts created:")
            print("   - Lecturer: lecturer@university.edu / lecturer123")
            print("   - Student:  student@university.edu / student123")
    except Exception as e:
        print(f"❌ Error during initialization: {e}")
    finally:
        db.close()
