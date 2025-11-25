import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from datetime import datetime

# Load environment variables
load_dotenv()

# Database configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "interview_bot")
COLLECTION_NAME = "users"

async def test_database_connection():
    print("\n" + "="*50)
    print("DATABASE CONNECTION TEST")
    print("="*50)
    
    try:
        # 1. Test MongoDB connection
        print("\n[1] Connecting to MongoDB...")
        client = AsyncIOMotorClient(MONGO_URI)
        await client.admin.command('ping')
        print("[SUCCESS] Connected to MongoDB")
        
        # 2. Test database access
        print("\n[2] Accessing database...")
        db = client[DB_NAME]
        print(f"[SUCCESS] Accessed database: {DB_NAME}")
        
        # 3. Test collection access
        print("\n[3] Accessing collection...")
        collection = db[COLLECTION_NAME]
        print(f"[SUCCESS] Accessed collection: {COLLECTION_NAME}")
        
        # 4. Test insert operation
        print("\n[4] Testing insert operation...")
        test_user = {
            "full_name": "Test User",
            "email": f"test_{int(datetime.now().timestamp())}@example.com",
            "hashed_password": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # hash of 'test123'
            "role": "candidate",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await collection.insert_one(test_user)
        if result.inserted_id:
            print(f"[SUCCESS] Inserted test user with ID: {result.inserted_id}")
            
            # 5. Test find operation
            print("\n[5] Testing find operation...")
            found = await collection.find_one({"_id": result.inserted_id})
            if found:
                print(f"[SUCCESS] Found test user: {found['email']}")
                
                # 6. Clean up test data
                print("\n[6] Cleaning up test data...")
                await collection.delete_one({"_id": result.inserted_id})
                print("[SUCCESS] Cleaned up test data")
            else:
                print("[ERROR] Failed to find test user")
        else:
            print("[ERROR] Failed to insert test user")
        
    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        if 'client' in locals():
            client.close()
        print("\n" + "="*50 + "\n")

if __name__ == "__main__":
    asyncio.run(test_database_connection())
