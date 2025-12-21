from fastapi import FastAPI, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from socketio import AsyncServer, ASGIApp
from db.database import Database
import uvicorn
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import time
import datetime

# OpenAI Whisper API
from openai import OpenAI

# Import password hashing
from utils.password_handler import get_password_hash

# Import routers
from routes import auth
from routes import job_criteria
from routes import skills
from routes import interview_questions
from routes import admin_hr
from routes import admin_candidates
from routes import system_logs
from routes import interviews
from routes import feedback
from routes import profile
from routes import notifications
from routes import applications
from routes import interview_rooms
from routes import interview_analysis

# Import socket handlers
from socket_handlers import setup_socket_handlers

# ✅ CRITICAL: Load .env FIRST before anything else
load_dotenv()

# ✅ Check API keys on startup
print("\n" + "="*80)
print("🔑 CHECKING API KEYS")
print("="*80)

openai_key = os.getenv("OPENAI_API_KEY")
groq_key = os.getenv("GROQ_API_KEY")

if openai_key:
    print(f"✅ OPENAI_API_KEY found: {openai_key[:20]}... (for Whisper)")
else:
    print("⚠️ OPENAI_API_KEY not found (Whisper transcription will fail)")

if groq_key:
    print(f"✅ GROQ_API_KEY found: {groq_key[:20]}... (for AI questions - FREE!)")
else:
    print("❌ GROQ_API_KEY not found - AI question generation will NOT work!")
    print("   Add GROQ_API_KEY to your .env file")

print("="*80 + "\n")

# ====================================================
# Create Admin on Startup
# ====================================================
async def create_admin_user():
    try:
        db = await Database.get_db()
        if db is None:
            print("❌ Cannot create admin — DB not connected")
            return

        admin_email = "admin@gmail.com"
        admin_password = "Admin@123"

        existing = await db.users.find_one({"email": admin_email})
        if existing:
            print("⚠️ Admin already exists. Skipping creation.")
            return

        admin_data = {
            "_id": os.urandom(12).hex(),
            "full_name": "Admin",
            "email": admin_email,
            "role": "admin",
            "hashed_password": get_password_hash(admin_password),
            "created_at": datetime.datetime.utcnow(),
            "updated_at": datetime.datetime.utcnow(),
        }

        await db.users.insert_one(admin_data)
        print("✅ Admin user created successfully!")

    except Exception as e:
        print(f"❌ Failed to create admin user: {e}")

# ====================================================
# Database getter function for socket handlers
# ====================================================
async def get_database():
    """Function to provide database instance to socket handlers"""
    try:
        return await Database.get_db()
    except Exception as e:
        print(f"[ERROR] get_database failed: {e}")
        return None

# ====================================================
# Socket.IO Server - CREATE FIRST
# ====================================================
sio = AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False
)

# ====================================================
# Lifespan Manager
# ====================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup code
    max_retries = 3
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            print(f"Attempting to connect to MongoDB (Attempt {attempt + 1}/{max_retries})...")
            await Database.initialize()
            print("✅ Successfully connected to MongoDB")

            await create_admin_user()
            
            # Setup socket handlers - NO AWAIT!
            setup_socket_handlers(sio, get_database)
            print("✅ Socket.IO handlers registered (including interview controls)")
            
            # ✅ CRITICAL FIX: Store sio in app.state so routes can access it
            app.state.sio = sio
            print("✅ Socket.IO instance stored in app.state")
            
            break

        except Exception as e:
            if attempt == max_retries - 1:
                print(f"❌ Failed to connect to MongoDB after {max_retries} attempts: {e}")
                raise
            print(f"⚠️ Attempt {attempt + 1} failed: {e}. Retrying in {retry_delay} seconds...")
            time.sleep(retry_delay)
    
    yield  # App runs here
    
    # Shutdown code
    try:
        await Database.close_connection()
        print("✅ Disconnected from MongoDB")
    except Exception as e:
        print(f"❌ Error disconnecting from MongoDB: {e}")

# ====================================================
# FastAPI App with Lifespan
# ====================================================
app = FastAPI(lifespan=lifespan)

# ====================================================
# CORS Middleware - ADD BEFORE WRAPPING
# ====================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# ====================================================
# OpenAI Clients
# ====================================================
# Client for Whisper (transcription)
try:
    whisper_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    print("✅ Whisper client initialized")
except Exception as e:
    print(f"⚠️ Whisper client initialization failed: {e}")
    whisper_client = None

# Client for GPT (AI questions) - using GPT_MODEL_KEY
try:
    gpt_client = OpenAI(api_key=os.getenv("GPT_MODEL_KEY"))
    print("✅ GPT client initialized for AI questions")
except Exception as e:
    print(f"⚠️ GPT client initialization failed: {e}")
    gpt_client = None

# ====================================================
# Include Routers
# ====================================================
app.include_router(auth.router)
app.include_router(job_criteria.router)
app.include_router(skills.router)
app.include_router(interview_questions.router)
app.include_router(admin_hr.router)
app.include_router(admin_candidates.router)
app.include_router(system_logs.router)
app.include_router(interviews.router)
app.include_router(feedback.router)
app.include_router(profile.router)
app.include_router(notifications.router)
app.include_router(applications.router)
app.include_router(applications.app_router)
app.include_router(interview_rooms.router)
app.include_router(interview_analysis.router)

# ====================================================
# Static Files
# ====================================================
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# ====================================================
# Root Endpoint
# ====================================================
@app.get("/")
async def root():
    return {
        "message": "Interview Bot API with Socket.IO is running",
        "ai_questions_enabled": bool(groq_key),  # Changed from gpt_model_key
        "whisper_enabled": bool(openai_key)
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        db = await Database.get_db()
        db_status = "connected" if db is not None else "disconnected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "cors": "enabled",
        "ai_questions": bool(groq_key),  # Changed
        "whisper": bool(openai_key)
    }

@app.get("/test-cors")
async def test_cors():
    """Test CORS endpoint"""
    return {
        "message": "CORS is working!",
        "status": "success",
        "allowed_origins": ["*"]
    }

# ✅ NEW: Test AI Configuration Endpoint
@app.get("/test-ai")
async def test_ai_config():
    """Test if AI question generation is properly configured"""
    openai_key = os.getenv("OPENAI_API_KEY")
    groq_key = os.getenv("GROQ_API_KEY")
    
    return {
        "openai_api_key": {
            "present": bool(openai_key),
            "preview": openai_key[:20] + "..." if openai_key else None,
            "usage": "Whisper transcription only"
        },
        "groq_api_key": {
            "present": bool(groq_key),
            "preview": groq_key[:20] + "..." if groq_key else None,
            "usage": "AI question generation (FREE!)"
        },
        "ai_handler_location": "ai_handler.py",
        "recommendation": "Groq is free with generous limits!" if groq_key else "Add GROQ_API_KEY to .env"
    }
# ✅ NEW: Test AI Question Generation
@app.get("/test-generate-question")
async def test_generate_question(field: str = "devops"):
    """Test endpoint to generate a single AI question"""
    try:
        if not os.getenv("GPT_MODEL_KEY"):
            return {
                "error": "GPT_MODEL_KEY not found in environment",
                "solution": "Add GPT_MODEL_KEY to your .env file"
            }
        
        # Import here to catch any import errors
        from ai_handler import generate_ai_question
        
        # Generate a test question
        question = await generate_ai_question(
            interview_id="test_interview",
            field=field,
            difficulty="medium"
        )
        
        if question:
            return {
                "success": True,
                "message": "AI question generated successfully!",
                "question": question,
                "field": field
            }
        else:
            return {
                "success": False,
                "error": "Question generation returned None",
                "check": "Look at server logs for detailed error"
            }
            
    except Exception as e:
        import traceback
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "solution": "Check if ai_handler.py exists and OpenAI package is installed"
        }

# ====================================================
# Whisper API Transcription Endpoint
# ====================================================
@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        if whisper_client is None:
            return {"error": "Whisper client not initialized - check OPENAI_API_KEY", "text": ""}
            
        # Read the audio file content
        audio_bytes = await file.read()
        
        # CRITICAL FIX: Use a tuple format that OpenAI expects
        # Format: (filename, file_content, content_type)
        audio_file = (
            file.filename or "audio.webm",  # Filename with extension
            audio_bytes,                     # Raw bytes
            file.content_type or "audio/webm"  # MIME type
        )
        
        print(f"[TRANSCRIBE] Processing audio file: {file.filename}, size: {len(audio_bytes)} bytes, type: {file.content_type}")

        result = whisper_client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-1",
            language="en",
            response_format="text"
        )
        
        print(f"[TRANSCRIBE] ✅ Success: {result[:100] if len(result) > 100 else result}")
        return {"text": result}

    except Exception as e:
        print(f"[ERROR] Transcription error: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e), "text": ""}

# ====================================================
# CRITICAL: Wrap with Socket.IO LAST
# ====================================================
socket_app = ASGIApp(sio, app)

# ====================================================
# Run Server - MUST USE socket_app!
# ====================================================
if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 Starting Interview Bot API Server")
    print("="*60)
    print(f"📡 Server: http://localhost:8000")
    print(f"📚 API Docs: http://localhost:8000/docs")
    print(f"🔌 Socket.IO: Enabled with interview controls")
    print(f"🌐 CORS: Enabled for all origins")
    print(f"🧪 Test CORS: http://localhost:8000/test-cors")
    print(f"🤖 Test AI Config: http://localhost:8000/test-ai")
    print(f"🎯 Test AI Generate: http://localhost:8000/test-generate-question?field=devops")
    print("="*60 + "\n")
    
    # CRITICAL: Use socket_app NOT app!
    uvicorn.run(
        "main:socket_app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )