import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from db.database import Database

# JWT Configuration
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')  # Change this to a secure secret in production
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 30


security = HTTPBearer(auto_error=False)


async def _parse_user_id_from_dummy_token(token: str) -> Optional[ObjectId]:
    """
    Parse user id from a dummy token generated as:
      f"dummy_token_{user['_id']}_{datetime.utcnow().timestamp()}"

    Note: In the current code, user['_id'] may be an ObjectId instance, which when
    interpolated into an f-string renders like "ObjectId('...')". We handle both
    raw hex ObjectId strings and the "ObjectId('...')" representation.
    """
    if not token or not token.startswith("dummy_token_"):
        return None

    try:
        # Strip prefix and split off timestamp from the right
        payload = token[len("dummy_token_") :]
        user_part, _ts = payload.rsplit("_", 1)

        # Handle ObjectId('...') or plain hex
        user_part = user_part.strip()
        if user_part.startswith("ObjectId(") and user_part.endswith(")"):
            # Extract inner content between ObjectId(' and ')
            inner = user_part[len("ObjectId(") : -1].strip()
            # Strip surrounding quotes if present
            if (inner.startswith("'") and inner.endswith("'")) or (
                inner.startswith('"') and inner.endswith('"')
            ):
                inner = inner[1:-1]
            user_part = inner

        if ObjectId.is_valid(user_part):
            return ObjectId(user_part)
        return None
    except Exception:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    """
    Dependency that validates the Authorization: Bearer <token> header and
    returns a minimal current user dict.

    In production you should replace this with proper JWT verification.
    """
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    user_id = await _parse_user_id_from_dummy_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user from DB
    db = await Database.get_db()
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "id": str(user["_id"]),
        "email": user.get("email"),
        "role": user.get("role", "candidate"),
    }
