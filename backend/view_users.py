import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Database configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "interview_bot")

async def view_users():
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    client = AsyncIOMotorClient(MONGO_URI)
    
    try:
        # Get database and collection
        db = client[DB_NAME]
        collection = db['users']
        
        # Get all users
        print("\nUsers in the database:")
        print("-" * 50)
        
        async for user in collection.find():
            # Create a copy and remove the _id for cleaner output
            user_data = user.copy()
            user_id = user_data.pop('_id', None)
            
            print(f"User ID: {user_id}")
            for key, value in user_data.items():
                print(f"{key}: {value}")
            print("-" * 50)
            
        # Count total users
        count = await collection.count_documents({})
        print(f"\nTotal users in collection: {count}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(view_users())
