import re
from pydantic import BaseModel, EmailStr, Field, validator, constr
from typing import Optional, Literal
from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException, status

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)

def validate_name(name: str) -> str:
    if not name.replace(' ', '').isalpha():
        raise ValueError("Name must contain only alphabets and spaces")
    if len(name) < 3 or len(name) > 50:
        raise ValueError("Name must be between 3 and 50 characters")
    return name.strip()

def validate_password(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise ValueError("Password must contain at least one special character")
    return password

class UserBase(BaseModel):
    full_name: str = Field(..., description="User's full name (3-50 characters, alphabets and spaces only)")
    email: EmailStr = Field(..., description="User's email address")
    role: Literal['candidate', 'hr'] = Field(..., description="User's role (must be 'candidate' or 'hr')")

    @validator('full_name')
    def validate_full_name(cls, v):
        try:
            return validate_name(v)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"field": "full_name", "msg": str(e)}
            )

    class Config:
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "full_name": "John Doe",
                "email": "john@example.com",
                "role": "candidate"
            }
        }

class UserCreate(UserBase):
    password: str = Field(..., description="Password (min 8 chars, must include uppercase, lowercase, digit, and special char)")

    @validator('password')
    def validate_password_strength(cls, v):
        try:
            return validate_password(v)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"field": "password", "msg": str(e)}
            )

    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "John Doe",
                "email": "john@example.com",
                "password": "Secure@123",
                "role": "candidate"
            }
        }

class UserLogin(BaseModel):
    """Model for user login credentials.
    
    Attributes:
        email (EmailStr): User's email address
        password (str): User's password (min 8 characters)
    """
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=8, description="User's password (min 8 characters)")

    @validator('email')
    def validate_email_format(cls, v):
        if not v or not v.strip():
            raise ValueError("Email is required")
        return v.strip().lower()

    @validator('password')
    def validate_password_presence(cls, v):
        if not v or not v.strip():
            raise ValueError("Password is required")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "email": "john@example.com",
                "password": "Secure@123"
            }
        }

class UserResponse(UserBase):
    id: str = Field(..., alias="_id")
    created_at: datetime

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "name": "John Doe",
                "email": "john@example.com",
                "role": "candidate",
                "created_at": "2023-01-01T00:00:00"
            }
        }

class UserInDB(UserBase):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True