from passlib.context import CryptContext
import hashlib

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt with SHA256 pre-hashing to handle passwords > 72 bytes.
    This ensures compatibility with bcrypt's 72-byte limit while maintaining security.
    """
    # Pre-hash with SHA256 to ensure we never exceed bcrypt's 72-byte limit
    # This is a recommended approach when dealing with potentially long passwords
    password_bytes = password.encode('utf-8')
    
    # If password is longer than 72 bytes, pre-hash it with SHA256
    if len(password_bytes) > 72:
        # SHA256 produces a fixed 64-character hex string (32 bytes)
        password = hashlib.sha256(password_bytes).hexdigest()
    
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    Handles the same SHA256 pre-hashing if needed.
    """
    # Apply the same transformation as in hashing
    password_bytes = plain_password.encode('utf-8')
    
    if len(password_bytes) > 72:
        plain_password = hashlib.sha256(password_bytes).hexdigest()
    
    return pwd_context.verify(plain_password, hashed_password)