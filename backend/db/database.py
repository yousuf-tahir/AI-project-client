import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from typing import Optional

# Load environment variables from .env file
load_dotenv()

# Get MongoDB connection details from environment variables
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "interview_bot")

class Database:
    """
    Database class to manage MongoDB connection and provide database instance.
    Uses singleton pattern to maintain a single connection pool.
    """
    _client: Optional[AsyncIOMotorClient] = None
    _db = None
    _lock = asyncio.Lock()
    
    @classmethod
    async def initialize(cls):
        """Initialize the MongoDB client and database connection."""
        if cls._client is None:
            try:
                cls._client = AsyncIOMotorClient(MONGO_URI)
                # Test the connection
                await cls._client.admin.command('ping')
                cls._db = cls._client[DB_NAME]
                print("Database connection established successfully")
            except Exception as e:
                print(f"Failed to connect to MongoDB: {e}")
                cls._client = None
                cls._db = None
                raise
    
    @classmethod
    async def get_db(cls):
        """Get the database instance."""
        if cls._db is None:
            await cls.initialize()
        if cls._db is None:
            raise RuntimeError("Failed to initialize database connection")
        return cls._db
    
    @classmethod
    async def close_connection(cls):
        """Close the MongoDB connection."""
        if cls._client is not None:
            cls._client.close()
            cls._client = None
            cls._db = None
