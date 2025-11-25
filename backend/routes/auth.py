from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.encoders import jsonable_encoder
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any
import os
from pathlib import Path
from pydantic import EmailStr
from bson import ObjectId

from db.database import Database
from models.user import UserCreate, UserInDB, UserResponse, UserLogin
from utils.password_handler import get_password_hash, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/register", 
    status_code=status.HTTP_201_CREATED,
    response_model=Dict[str, str],
    responses={
        201: {"description": "User registered successfully"},
        400: {"description": "Email already registered or invalid role"},
        500: {"description": "Internal server error"}
    }
)
async def register(user: UserCreate):
    """
    Register a new user with the provided information.
    
    - **full_name**: User's full name
    - **email**: User's email (must be unique)
    - **password**: User's password (min 6 characters)
    - **role**: User's role (must be either 'candidate' or 'hr')
    """
    print("\n" + "="*50)
    print("REGISTRATION ATTEMPT")
    print("="*50)
    
    try:
        # Log incoming request data
        print("\n[1] Received registration data:")
        print(f"- Full Name: {user.full_name}")
        print(f"- Email: {user.email}")
        print(f"- Role: {user.role}")
        print(f"- Password: {'*' * len(user.password) if user.password else 'Not provided'}")
        
        # Get database instance
        try:
            db = await Database.get_db()
            if db is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to connect to database"
                )
            print("\n[2] Database connection established")
        except Exception as e:
            print(f"\n[ERROR] Database connection failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database connection error: {str(e)}"
            )
        
        # Validate role
        if not isinstance(user.role, str) or user.role.lower() not in ["candidate", "hr"]:
            error_msg = f"Invalid role: {user.role}. Must be 'candidate' or 'hr'"
            print(f"[ERROR] {error_msg}")
            print("="*50 + "\n")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        # Check if user already exists
        print(f"\n[3] Checking if user with email {user.email} exists...")
        existing_user = await db.users.find_one({"email": user.email})
        if existing_user:
            print(f"[ERROR] User with email {user.email} already exists")
            print("="*50 + "\n")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Prepare user data
        user_dict = user.dict()
        user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
        user_dict["created_at"] = datetime.utcnow()
        user_dict["updated_at"] = datetime.utcnow()
        # HR approval workflow: default new HRs to Pending status
        if user_dict.get("role", "").lower() == "hr":
            user_dict["hr_status"] = "Pending"
        # Candidate approval workflow: default new candidates to Pending status
        if user_dict.get("role", "").lower() == "candidate":
            user_dict["candidate_status"] = "Pending"
        
        print("\n[4] Attempting to insert user into database...")
        result = await db.users.insert_one(user_dict)
        
        if not result.inserted_id:
            error_msg = "Database operation failed: No inserted_id returned"
            print(f"[ERROR] {error_msg}")
            print("="*50 + "\n")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_msg
            )
        
        print(f"\n[SUCCESS] User created with ID: {result.inserted_id}")
        print("="*50 + "\n")
        
        return {"message": "User registered successfully"}
        
    except HTTPException as he:
        # Re-raise HTTP exceptions as they are already handled
        raise he
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print("\n[ERROR] Unexpected error during registration:")
        print(error_details)
        print("="*50 + "\n")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.post(
    "/login",
    status_code=status.HTTP_200_OK,
    response_model=dict,
    responses={
        200: {
            "description": "Login successful",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Login successful",
                        "role": "candidate",
                        "redirect_url": "/candidate-dashboard"
                    }
                }
            }
        },
        400: {"description": "Invalid request data"},
        401: {"description": "Incorrect email or password"},
        500: {"description": "Internal server error"}
    }
)
async def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...)
):
    """
    Authenticate a user and return login response with role-based redirect URL.
    
    - **username**: User's email
    - **password**: User's password
    
    Returns:
        - message: Login status message
        - role: User's role (candidate/hr/admin)
        - redirect_url: Role-specific dashboard URL
    """
    # Create UserLogin object from form data
    credentials = UserLogin(email=username, password=password)
    try:
        print(f"\n[LOGIN] Attempting login for email: {credentials.email}")
        
        # Add CORS headers
        response_headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Accept",
            "Access-Control-Allow-Credentials": "true"
        }
        
        # Handle preflight requests
        if request.method == "OPTIONS":
            return JSONResponse(
                status_code=200,
                headers=response_headers,
                content={"message": "CORS preflight successful"}
            )
        
        # Get database instance
        db = await Database.get_db()
        if db is None:
            error_msg = "Failed to connect to database"
            print(f"[ERROR] {error_msg}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_msg,
                headers=response_headers
            )
        
        # Find user by email (case-insensitive)
        user = await db.users.find_one({"email": {"$regex": f"^{credentials.email}$", "$options": "i"}})
        
        # Check if user exists
        if not user:
            error_msg = "Incorrect email or password"
            print(f"[AUTH FAILED] User not found: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error_msg
            )
        
        # Verify password
        if not verify_password(credentials.password, user.get("hashed_password", "")):
            error_msg = "Incorrect email or password"
            print(f"[AUTH FAILED] Invalid password for user: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error_msg
            )
        
        # Get user role (default to 'candidate' if not specified for backward compatibility)
        user_role = user.get("role", "candidate")

        # Enforce HR approval before allowing login
        if user_role.lower() == "hr":
            hr_status = user.get("hr_status", "Pending")
            if hr_status != "Approved":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="HR account is not approved yet"
                )
        # Candidate accounts can login without approval
        # No need to check candidate_status
        
        # Determine redirect URL based on role
        role_redirects = {
            "candidate": "/candidate-dashboard",
            "hr": "/hr-dashboard",
            "admin": "/admin-dashboard"
        }
        
        redirect_url = role_redirects.get(user_role.lower(), "/default-dashboard")
        
        print(f"[LOGIN SUCCESS] User {user['email']} logged in as {user_role}")
        
        # Generate a simple access token (in a real app, use proper JWT or similar)
        # This is just a placeholder - in production, use a proper token generation method
        access_token = f"dummy_token_{user['_id']}_{datetime.utcnow().timestamp()}"
        
        response_data = {
            "message": "Login successful",
            "role": user_role,
            "redirect_url": redirect_url,
            "access_token": access_token,
            "user_id": str(user["_id"]),
            "email": user["email"]
        }
        
        return JSONResponse(
            content=response_data,
            headers=response_headers
        )
        
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions as-is
        raise http_exc
    except Exception as e:
        error_msg = f"An error occurred during login: {str(e)}"
        print(f"[ERROR] {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@router.patch(
    "/me",
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "User updated"},
        400: {"description": "Invalid input"},
        404: {"description": "User not found"},
        409: {"description": "Email already in use"},
        500: {"description": "Internal server error"},
    },
)
async def update_current_user(payload: Dict[str, Any]):
    """
    Update current user's profile fields. Accepts JSON body containing
    one or more of: user_id, email (identifier), full_name (new), new_email (new).
    If both identifiers provided, user_id takes precedence.
    """
    try:
        db = await Database.get_db()
        if db is None:
            raise HTTPException(status_code=500, detail="Failed to connect to database")

        user_id = payload.get("user_id")
        email = payload.get("email")
        new_full_name = payload.get("full_name")
        new_email = payload.get("new_email")
        new_org = payload.get("organization_name")
        new_phone = payload.get("phone")
        new_location = payload.get("location")

        if not user_id and not email:
            raise HTTPException(status_code=400, detail="Provide user_id or email to identify the user")

        # Resolve user
        if user_id:
            try:
                _id = ObjectId(user_id)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid user_id")
            query = {"_id": _id}
        else:
            query = {"email": {"$regex": f"^{email}$", "$options": "i"}}

        user = await db.users.find_one(query)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        updates: Dict[str, Any] = {}
        if isinstance(new_full_name, str) and new_full_name.strip():
            updates["full_name"] = new_full_name.strip()
        if isinstance(new_email, str) and new_email.strip():
            # Ensure email unique
            exists = await db.users.find_one({
                "email": {"$regex": f"^{new_email}$", "$options": "i"},
                "_id": {"$ne": user["_id"]},
            })
            if exists:
                raise HTTPException(status_code=409, detail="Email already in use")
            updates["email"] = new_email.strip().lower()

        # Optional HR profile fields
        if isinstance(new_org, str):
            org_clean = new_org.strip()
            if org_clean:
                updates["organization_name"] = org_clean
            else:
                # allow clearing value explicitly
                updates["organization_name"] = ""
        if isinstance(new_phone, str):
            updates["phone"] = new_phone.strip()
        if isinstance(new_location, str):
            updates["location"] = new_location.strip()

        if not updates:
            return {"message": "No changes"}

        updates["updated_at"] = datetime.utcnow()
        await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
        return {"message": "Profile updated"}
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Failed to update profile: {str(e)}"
        print(f"[ERROR] {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "Password changed"},
        400: {"description": "Invalid input"},
        401: {"description": "Incorrect current password"},
        404: {"description": "User not found"},
        500: {"description": "Internal server error"},
    },
)
async def change_password(payload: Dict[str, Any]):
    """
    Change password for the user. Body: user_id or email, current_password, new_password
    """
    try:
        db = await Database.get_db()
        if db is None:
            raise HTTPException(status_code=500, detail="Failed to connect to database")

        user_id = payload.get("user_id")
        email = payload.get("email")
        current_password = payload.get("current_password")
        new_password = payload.get("new_password")

        if not (user_id or email) or not current_password or not new_password:
            raise HTTPException(status_code=400, detail="user_id/email, current_password and new_password are required")

        # Resolve user
        if user_id:
            try:
                _id = ObjectId(user_id)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid user_id")
            query = {"_id": _id}
        else:
            query = {"email": {"$regex": f"^{email}$", "$options": "i"}}

        user = await db.users.find_one(query)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Verify current password
        if not verify_password(current_password, user.get("hashed_password", "")):
            raise HTTPException(status_code=401, detail="Incorrect current password")

        # Update password
        hashed = get_password_hash(new_password)
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"hashed_password": hashed, "updated_at": datetime.utcnow()}})
        return {"message": "Password changed"}
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Failed to change password: {str(e)}"
        print(f"[ERROR] {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@router.post(
    "/upload-avatar",
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "Avatar uploaded"},
        400: {"description": "Invalid input"},
        404: {"description": "User not found"},
        500: {"description": "Internal server error"},
    },
)
async def upload_avatar(user_id: str = Form(...), file: UploadFile = File(...)):
    try:
        db = await Database.get_db()
        if db is None:
            raise HTTPException(status_code=500, detail="Failed to connect to database")

        # Validate user
        try:
            _id = ObjectId(user_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid user_id")

        user = await db.users.find_one({"_id": _id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Validate file type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image uploads are allowed")

        # Determine extension
        ext = os.path.splitext(file.filename or "")[1].lower() or ".png"
        if ext not in [".png", ".jpg", ".jpeg", ".gif", ".webp"]:
            ext = ".png"

        # Save to static/avatars
        base_dir = Path(__file__).resolve().parent.parent  # backend/ directory
        static_dir = base_dir / "static" / "avatars"
        static_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{user_id}{ext}"
        file_path = static_dir / filename

        with open(file_path, "wb") as out:
            out.write(await file.read())

        # Store URL relative to API root
        relative_url = f"/static/avatars/{filename}"
        await db.users.update_one(
            {"_id": _id},
            {"$set": {"avatar_url": relative_url, "updated_at": datetime.utcnow()}},
        )

        return {"avatar_url": relative_url}
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Failed to upload avatar: {str(e)}"
        print(f"[ERROR] {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@router.get("/avatar/{user_id}")
async def get_avatar(user_id: str):
    try:
        db = await Database.get_db()
        if db is None:
            raise HTTPException(status_code=500, detail="Failed to connect to database")

        try:
            _id = ObjectId(user_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid user_id")

        user = await db.users.find_one({"_id": _id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        avatar_url = user.get("avatar_url")
        if not avatar_url:
            raise HTTPException(status_code=404, detail="Avatar not set")

        # Compute file path from relative URL
        base_dir = Path(__file__).resolve().parent.parent
        expected_path = base_dir / avatar_url.lstrip("/")
        if not expected_path.exists():
            raise HTTPException(status_code=404, detail="Avatar file not found")

        return FileResponse(str(expected_path))
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Error retrieving avatar: {str(e)}"
        print(f"[ERROR] {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@router.get(
    "/me",
    status_code=status.HTTP_200_OK,
    responses={
        200: {"description": "Current user details"},
        400: {"description": "Missing or invalid identifier"},
        404: {"description": "User not found"},
        500: {"description": "Internal server error"},
    },
)
async def get_current_user(user_id: str | None = None, email: EmailStr | None = None):
    """
    Fetch minimal current user info by user_id or email.

    Query params:
      - user_id: Mongo ObjectId as string
      - email: user's email
    """
    try:
        db = await Database.get_db()
        if db is None:
            raise HTTPException(status_code=500, detail="Failed to connect to database")

        if not user_id and not email:
            raise HTTPException(status_code=400, detail="Provide either user_id or email")

        query: Dict[str, Any]
        if user_id:
            try:
                _id = ObjectId(user_id)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid user_id")
            query = {"_id": _id}
        else:
            # case-insensitive email match
            query = {"email": {"$regex": f"^{email}$", "$options": "i"}}

        user = await db.users.find_one(query)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "_id": str(user.get("_id")),
            "full_name": user.get("full_name", ""),
            "email": user.get("email", ""),
            "role": user.get("role", ""),
            "avatar_url": user.get("avatar_url", ""),
            "organization_name": user.get("organization_name", ""),
            "phone": user.get("phone", ""),
            "location": user.get("location", ""),
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"An error occurred fetching current user: {str(e)}"
        print(f"[ERROR] {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)
