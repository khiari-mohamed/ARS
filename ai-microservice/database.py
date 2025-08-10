import asyncpg
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.pool = None
    
    async def initialize(self):
        """Initialize database connection pool"""
        try:
            self.pool = await asyncpg.create_pool(
                self.connection_string,
                min_size=5,
                max_size=20,
                command_timeout=60
            )
            logger.info("Database connection pool initialized")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    async def close(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")
    
    async def get_live_complaints(self, limit: int = 100) -> List[Dict]:
        """Fetch live complaints from ARS database"""
        query = """
        SELECT r.id, r.description, r."createdAt" as created_at, r.status, 
               r."assignedToId" as team_id, r."processId" as process_id,
               r.type, r.severity, r.department, r.priority
        FROM "Reclamation" r 
        WHERE r.status IN ('open', 'in_progress', 'assigned')
        ORDER BY r."createdAt" DESC 
        LIMIT $1
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, limit)
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error fetching complaints: {e}")
            return []
    
    async def get_live_workload(self) -> List[Dict]:
        """Fetch live workload data"""
        query = """
        SELECT b."assignedToUserId" as team_id, COUNT(*) as workload_count
        FROM "Bordereau" b 
        WHERE b.statut IN ('EN_COURS', 'ASSIGNE', 'A_AFFECTER')
        AND b."assignedToUserId" IS NOT NULL
        GROUP BY b."assignedToUserId"
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query)
                return [{"teamId": row["team_id"], "_count": {"id": row["workload_count"]}} for row in rows]
        except Exception as e:
            logger.error(f"Error fetching workload: {e}")
            return []
    
    async def get_sla_items(self) -> List[Dict]:
        """Fetch SLA tracking items"""
        query = """
        SELECT b.id, b."dateReception" as start_date, 
               (b."dateReception" + INTERVAL '1 day' * b."delaiReglement") as deadline,
               CASE WHEN b."dateCloture" IS NOT NULL THEN 100 ELSE 
                    CASE WHEN b.statut = 'EN_COURS' THEN 50 ELSE 10 END 
               END as current_progress,
               100 as total_required,
               b."delaiReglement" as sla_days,
               b.statut, b.priority
        FROM "Bordereau" b 
        WHERE b.statut NOT IN ('CLOTURE', 'VIREMENT_EXECUTE')
        ORDER BY b."dateReception" DESC
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query)
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error fetching SLA items: {e}")
            return []
    
    async def get_performance_data(self, period: str = "current_month") -> List[Dict]:
        """Fetch performance data"""
        query = """
        SELECT user_id, actual_performance, expected_performance
        FROM performance_metrics 
        WHERE period = $1
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, period)
                return [{"id": row["user_id"], "actual": row["actual_performance"], "expected": row["expected_performance"]} for row in rows]
        except Exception as e:
            logger.error(f"Error fetching performance data: {e}")
            return []
    
    async def save_prediction_result(self, endpoint: str, input_data: Dict, result: Dict, user_id: str):
        """Save prediction results for audit trail"""
        query = """
        INSERT INTO prediction_logs (endpoint, input_data, result, user_id, created_at)
        VALUES ($1, $2, $3, $4, $5)
        """
        try:
            async with self.pool.acquire() as conn:
                await conn.execute(
                    query, 
                    endpoint, 
                    json.dumps(input_data), 
                    json.dumps(result), 
                    user_id, 
                    datetime.utcnow()
                )
        except Exception as e:
            logger.error(f"Error saving prediction result: {e}")

# Global database manager instance
db_manager = None

async def get_db_manager():
    """Get database manager instance"""
    global db_manager
    if db_manager is None:
        # Use actual ARS database connection string
        connection_string = "postgresql://postgres:23044943@localhost:5432/arsdb"
        db_manager = DatabaseManager(connection_string)
        await db_manager.initialize()
    return db_manager