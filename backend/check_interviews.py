import asyncio
from db.database import Database
from bson import ObjectId

async def check_interviews():
    try:
        # Get database instance
        db = await Database.get_db()
        
        # Check if the collection exists
        collections = await db.list_collection_names()
        print(f"\nAvailable collections: {collections}")
        
        # Count all documents in the interviews collection
        count = await db.interviews.count_documents({})
        print(f"\nTotal interviews: {count}")
        
        # Count interviews with HR assigned
        hr_count = await db.interviews.count_documents({"hr_id": {"$exists": True, "$ne": None}})
        print(f"Interviews with HR assigned: {hr_count}")
        
        # Find one interview document
        interview = await db.interviews.find_one()
        if interview:
            print("\nSample interview document:")
            # Convert ObjectId to string for printing
            if '_id' in interview:
                interview['_id'] = str(interview['_id'])
            if 'candidate_id' in interview:
                interview['candidate_id'] = str(interview['candidate_id'])
            if 'hr_id' in interview:
                interview['hr_id'] = str(interview['hr_id'])
            print(interview)
        else:
            print("\nNo interviews found in the database.")
            
        # Check if the collection is empty
        if count > 0:
            # Get the first document to check its structure
            first_doc = await db.interviews.find_one()
            print("\nFirst document structure:")
            print({k: type(v).__name__ for k, v in first_doc.items()})
            
    except Exception as e:
        print(f"\nError: {e}")
    finally:
        # Close the database connection
        await Database.close_connection()

# Run the async function
if __name__ == "__main__":
    asyncio.run(check_interviews())
