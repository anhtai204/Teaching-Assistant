from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
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
            print("✨ No users found. Creating default lecturer account...")
            salt = bcrypt.gensalt()
            hashed_pw = bcrypt.hashpw("lecturer123".encode('utf-8'), salt).decode('utf-8')
            
            default_lecturer = User(
                email="lecturer@university.edu",
                password_hash=hashed_pw,
                full_name="Default Lecturer",
                role="lecturer"
            )
            db.add(default_lecturer)
            db.commit()
            print("✅ Default lecturer created: lecturer@university.edu / lecturer123")
    except Exception as e:
        print(f"❌ Error during initialization: {e}")
    finally:
        db.close()
