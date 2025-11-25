import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Database configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "interview_bot")
COLLECTION_NAME = "users"

async def check_database():
    try:
        # Connect to MongoDB
        print(f"Connecting to MongoDB at {MONGO_URI}...")
        client = AsyncIOMotorClient(MONGO_URI)
        
        # Check connection
        await client.admin.command('ping')
        print("Successfully connected to MongoDB")
        
        # Get database and collection
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]
        
        # Create collection if it doesn't exist
        if COLLECTION_NAME not in await db.list_collection_names():
            print(f"Creating collection '{COLLECTION_NAME}'...")
            await db.create_collection(COLLECTION_NAME)
            print(f"Created collection '{COLLECTION_NAME}'")
            
            # Create indexes if needed
            await collection.create_index("email", unique=True)
            print("Created email index")
        else:
            print(f"Collection '{COLLECTION_NAME}' already exists")
        
        # Show existing collections
        collections = await db.list_collection_names()
        print(f"\nCollections in database '{DB_NAME}':")
        for col in collections:
            print(f"- {col}")
        
        # Count documents in users collection
        count = await collection.count_documents({})
        print(f"\nTotal users in collection: {count}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(check_database())
