import asyncio
from db.database import Database

async def cleanup_orphaned_analyses():
    """
    Delete analysis records that have no corresponding interview
    """
    try:
        db = await Database.get_db()
        
        print("\n" + "="*80)
        print("🧹 CLEANING UP ORPHANED ANALYSES")
        print("="*80)
        
        # Get all analyses
        analyses = await db.interview_analysis.find({}).to_list(length=None)
        
        orphaned_ids = []
        
        for analysis in analyses:
            interview_id = analysis.get("interview_id")
            candidate_id = analysis.get("candidate_id")
            score = analysis.get("overall_score")
            created = analysis.get("created_at")
            
            # Check if interview exists
            interview = await db.interviews.find_one({"_id": interview_id})
            
            if not interview:
                orphaned_ids.append(interview_id)
                print(f"\n⚠️  Found orphaned analysis:")
                print(f"   Interview ID: {interview_id}")
                print(f"   Candidate ID: {candidate_id}")
                print(f"   Score: {score}")
                print(f"   Created: {created}")
        
        if not orphaned_ids:
            print("\n✅ No orphaned analyses found!")
        else:
            print(f"\n📋 Found {len(orphaned_ids)} orphaned analysis/analyses")
            print("\nThese analyses have no corresponding interview record.")
            print("They were likely created for interviews that were later deleted.")
            
            confirm = input("\n❓ Delete these orphaned analyses? (yes/no): ")
            
            if confirm.lower() == 'yes':
                deleted_count = 0
                for interview_id in orphaned_ids:
                    result = await db.interview_analysis.delete_one({"interview_id": interview_id})
                    if result.deleted_count > 0:
                        print(f"✅ Deleted orphaned analysis: {interview_id}")
                        deleted_count += 1
                    else:
                        print(f"❌ Failed to delete: {interview_id}")
                
                print(f"\n🎉 Cleanup complete! Deleted {deleted_count} orphaned analysis/analyses")
            else:
                print("\n❌ Cleanup cancelled - orphaned analyses will remain in database")
        
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await Database.close_connection()

if __name__ == "__main__":
    asyncio.run(cleanup_orphaned_analyses())