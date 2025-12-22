import asyncpg
import asyncio
from collections import Counter

async def check_bordereaux():
    conn = await asyncpg.connect(
        host='localhost',
        port=5432,
        user='postgres',
        password='23044943',
        database='arsdb'
    )
    
    # Get all bordereaux with their statuses
    query = """
    SELECT reference, statut::text as status
    FROM "Bordereau"
    ORDER BY "createdAt" DESC
    """
    
    rows = await conn.fetch(query)
    
    print(f"\n{'='*60}")
    print(f"TOTAL BORDEREAUX: {len(rows)}")
    print(f"{'='*60}\n")
    
    # Count by status
    status_counts = Counter(row['status'] for row in rows)
    
    print("STATUS DISTRIBUTION:")
    print("-" * 60)
    for status, count in status_counts.most_common():
        print(f"{status:30} : {count:3} bordereaux")
    
    print(f"\n{'='*60}")
    print(f"UNIQUE STATUSES: {len(status_counts)}")
    print(f"{'='*60}\n")
    
    # Show first 10 bordereaux
    print("FIRST 10 BORDEREAUX:")
    print("-" * 60)
    for i, row in enumerate(rows[:10], 1):
        print(f"{i:2}. {row['reference']:20} -> {row['status']}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_bordereaux())
