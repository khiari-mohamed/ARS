import asyncpg
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import logging
from functools import wraps

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.pool = None
    
    async def initialize(self):
        """Initialize database connection pool with better error handling"""
        try:
            self.pool = await asyncpg.create_pool(
                self.connection_string,
                min_size=2,
                max_size=10,
                command_timeout=30,
                server_settings={
                    'application_name': 'ars_ai_microservice',
                    'tcp_keepalives_idle': '600',
                    'tcp_keepalives_interval': '30',
                    'tcp_keepalives_count': '3'
                }
            )
            logger.info("Database connection pool initialized")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            # Don't raise - allow service to start without DB
            self.pool = None
    
    async def close(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")
    
    async def get_live_complaints(self, limit: int = 100) -> List[Dict]:
        """Fetch live complaints from ARS database"""
        if not self.pool:
            logger.warning("Database pool not available")
            return []
            
        query = """
        SELECT r.id, r.description, r."createdAt" as "createdAt", r.status, 
               r."assignedToId" as team_id, r."processId" as process_id,
               r.type, r.severity, r.department, r.priority,
               c.name as client_name
        FROM "Reclamation" r 
        LEFT JOIN "Client" c ON r."clientId" = c.id
        ORDER BY r."createdAt" DESC 
        LIMIT $1
        """
        try:
            conn = await asyncio.wait_for(self.pool.acquire(), timeout=10)
            try:
                rows = await asyncio.wait_for(conn.fetch(query, limit), timeout=30)
                return [dict(row) for row in rows]
            finally:
                await self.pool.release(conn)
        except asyncio.TimeoutError:
            logger.error("Database query timeout")
            return []
        except Exception as e:
            logger.error(f"Error fetching complaints: {e}")
            return []
    
    async def get_agent_performance_metrics(self) -> List[Dict]:
        """Get real agent performance data for assignment AI"""
        query = """
        SELECT u.id, u.email as username, u."fullName" as full_name, u.role,
               COUNT(b.id) as total_bordereaux,
               COALESCE(AVG(EXTRACT(EPOCH FROM (b."dateCloture" - b."dateReception"))/3600), 24) as avg_hours,
               COUNT(CASE WHEN b."dateCloture" IS NOT NULL AND b."dateCloture" <= (b."dateReception" + INTERVAL '1 day' * b."delaiReglement") THEN 1 END) as sla_compliant,
               COUNT(CASE WHEN b.statut = 'EN_DIFFICULTE' THEN 1 END) as rejected_count,
               COALESCE(MAX(b."updatedAt"), NOW()) as last_activity
        FROM "User" u
        LEFT JOIN "Bordereau" b ON u.id = b."assignedToUserId"
        WHERE u.role IN ('GESTIONNAIRE', 'CHEF_EQUIPE') AND u.active = true
        GROUP BY u.id, u.email, u."fullName", u.role
        ORDER BY u.role DESC, total_bordereaux DESC
        """
        if not self.pool:
            return []
        try:
            conn = await self.pool.acquire()
            try:
                rows = await conn.fetch(query)
                agents = []
                for row in rows:
                    # Split full name into first and last name
                    full_name = row['full_name'] or 'Agent ARS'
                    name_parts = full_name.split(' ', 1)
                    first_name = name_parts[0] if name_parts else 'Agent'
                    last_name = name_parts[1] if len(name_parts) > 1 else 'ARS'
                    
                    agents.append({
                        'id': row['id'],
                        'username': row['username'],
                        'firstName': first_name,
                        'lastName': last_name,
                        'role': row['role'],
                        'total_bordereaux': int(row['total_bordereaux'] or 0),
                        'avg_hours': float(row['avg_hours'] or 24),
                        'sla_compliant': int(row['sla_compliant'] or 0),
                        'rejected_count': int(row['rejected_count'] or 0),
                        'last_activity': row['last_activity']
                    })
                return agents
            finally:
                await self.pool.release(conn)
        except Exception as e:
            logger.error(f"Error fetching agent metrics: {e}")
            return []
    
    async def get_bordereau_with_sla_data(self, limit: int = 100) -> List[Dict]:
        """Get bordereaux with real SLA calculation data"""
        query = """
        SELECT b.id, b.reference, b."dateReception", b."dateCloture", b."delaiReglement",
               b.statut, b."assignedToUserId", b."nombreBS", b.priority,
               c.name as client_name,
               u."fullName" as assigned_to_name,
               CASE 
                   WHEN b."dateCloture" IS NULL THEN 
                       EXTRACT(EPOCH FROM (NOW() - b."dateReception"))/86400
                   ELSE 
                       EXTRACT(EPOCH FROM (b."dateCloture" - b."dateReception"))/86400
               END as processing_days,
               CASE 
                   WHEN b."dateCloture" IS NULL THEN 
                       b."delaiReglement" - EXTRACT(EPOCH FROM (NOW() - b."dateReception"))/86400
                   ELSE 0
               END as days_remaining
        FROM "Bordereau" b
        LEFT JOIN "Client" c ON b."clientId" = c.id
        LEFT JOIN "User" u ON b."assignedToUserId" = u.id
        WHERE b.statut NOT IN ('CLOTURE')
        ORDER BY b."dateReception" DESC
        LIMIT $1
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, limit)
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error fetching bordereau SLA data: {e}")
            return []
    
    async def get_client_historical_data(self, client_id: int = None, days: int = 90) -> List[Dict]:
        """Get historical data for forecasting"""
        try:
            async with self.pool.acquire() as conn:
                if client_id:
                    query = """
                    SELECT DATE(b."dateReception") as reception_date,
                           c.id as client_id, c.name as client_name,
                           COUNT(b.id) as bordereau_count,
                           SUM(b."nombreBS") as total_bs,
                           AVG(b."delaiReglement") as avg_sla_days
                    FROM "Bordereau" b
                    JOIN "Client" c ON b."clientId" = c.id
                    WHERE b."dateReception" >= NOW() - INTERVAL $1 AND b."clientId" = $2
                    GROUP BY DATE(b."dateReception"), c.id, c.name
                    ORDER BY reception_date DESC
                    """
                    rows = await conn.fetch(query, f"{days} days", client_id)
                else:
                    query = """
                    SELECT DATE(b."dateReception") as reception_date,
                           c.id as client_id, c.name as client_name,
                           COUNT(b.id) as bordereau_count,
                           SUM(b."nombreBS") as total_bs,
                           AVG(b."delaiReglement") as avg_sla_days
                    FROM "Bordereau" b
                    JOIN "Client" c ON b."clientId" = c.id
                    WHERE b."dateReception" >= NOW() - INTERVAL $1
                    GROUP BY DATE(b."dateReception"), c.id, c.name
                    ORDER BY reception_date DESC
                    """
                    rows = await conn.fetch(query, f"{days} days")
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error fetching historical data: {e}")
            return []
    
    async def get_live_workload(self) -> List[Dict]:
        """Fetch live workload data"""
        query = """
        SELECT b."assignedToUserId" as team_id, b.statut, COUNT(*) as workload_count
        FROM "Bordereau" b 
        WHERE b.statut::text IN ('EN_COURS', 'ASSIGNE', 'A_AFFECTER', 'RECU', 'SCANNE')
        AND b."assignedToUserId" IS NOT NULL
        GROUP BY b."assignedToUserId", b.statut
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query)
                return [{"teamId": row["team_id"], "status": row["statut"], "_count": {"id": row["workload_count"]}} for row in rows]
        except Exception as e:
            logger.error(f"Error fetching workload: {e}")
            return []
    
    async def get_sla_items(self) -> List[Dict]:
        """Fetch SLA tracking items with days remaining calculation"""
        query = """
        SELECT b.id, b."dateReception" as start_date, 
               (b."dateReception" + INTERVAL '1 day' * b."delaiReglement") as deadline,
               CASE WHEN b."dateCloture" IS NOT NULL THEN 100 ELSE 
                    CASE WHEN b.statut::text = 'EN_COURS' THEN 50 ELSE 10 END 
               END as current_progress,
               100 as total_required,
               b."delaiReglement" as sla_days,
               b.statut::text as statut, b.priority,
               CASE 
                   WHEN b."dateCloture" IS NULL THEN 
                       b."delaiReglement" - EXTRACT(EPOCH FROM (NOW() - b."dateReception"))/86400
                   ELSE 0
               END as days_remaining
        FROM "Bordereau" b 
        WHERE b.statut::text NOT IN ('CLOTURE', 'ANNULE')
        ORDER BY b."dateReception" DESC
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query)
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error fetching SLA items: {e}")
            return []
    
    async def get_bordereaux_for_training(self, limit: int = 1000) -> List[Dict]:
        """Get real bordereaux with diverse statuses for AI training"""
        # First check what statuses exist
        count_query = "SELECT statut::text, COUNT(*) FROM \"Bordereau\" GROUP BY statut"
        
        query = """
        SELECT 
            b.id,
            b.reference,
            b.statut::text as status,
            b."nombreBS" as nombre_bs,
            b."delaiReglement" as delai,
            b."dateReception",
            b."dateCloture",
            c.name as client_name,
            u."fullName" as assigned_to,
            CONCAT(
                'Bordereau ', b.reference, 
                ' Client: ', COALESCE(c.name, 'Unknown'),
                ' Nombre BS: ', COALESCE(b."nombreBS", 0),
                ' Statut: ', b.statut::text,
                ' Délai: ', COALESCE(b."delaiReglement", 30), ' jours',
                CASE WHEN b."dateCloture" IS NOT NULL 
                    THEN ' Clôturé le ' || TO_CHAR(b."dateCloture", 'DD/MM/YYYY')
                    ELSE ' En cours depuis ' || TO_CHAR(b."dateReception", 'DD/MM/YYYY')
                END
            ) as document_content
        FROM "Bordereau" b
        LEFT JOIN "Client" c ON b."clientId" = c.id
        LEFT JOIN "User" u ON b."assignedToUserId" = u.id
        ORDER BY b."createdAt" DESC
        LIMIT $1
        """
        try:
            async with self.pool.acquire() as conn:
                # Check status distribution
                status_counts = await conn.fetch(count_query)
                logger.info(f"Status distribution in DB: {dict(status_counts)}")
                
                rows = await conn.fetch(query, limit)
                result = [dict(row) for row in rows]
                logger.info(f"Fetched {len(result)} bordereaux for training")
                if result:
                    statuses = set(r['status'] for r in result)
                    logger.info(f"Unique statuses found: {statuses}")
                return result
        except Exception as e:
            logger.error(f"Error fetching bordereaux for training: {e}")
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
    
    async def save_ai_output(self, endpoint: str, input_data: Dict, result: Dict, user_id: str, confidence: float = None):
        """Save all AI outputs to database for learning and reuse"""
        try:
            # Check if AI outputs table exists
            check_query = """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'AiOutput'
            )
            """
            async with self.pool.acquire() as conn:
                table_exists = await conn.fetchval(check_query)
                
                if table_exists:
                    query = """
                    INSERT INTO "AiOutput" (endpoint, "inputData", result, "userId", confidence, "createdAt")
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """
                    await conn.execute(
                        query, 
                        endpoint, 
                        json.dumps(input_data), 
                        json.dumps(result), 
                        user_id,
                        confidence,
                        datetime.utcnow()
                    )
                    
                    # Save to learning engine for continuous improvement
                    await self.save_learning_data(endpoint, input_data, result, user_id, confidence)
                    
                    logger.info(f"AI output saved and learned: {endpoint}")
                else:
                    logger.info(f"AI output logged: {endpoint} for user {user_id}")
        except Exception as e:
            logger.debug(f"AI output logging skipped: {e}")
    
    async def save_learning_data(self, endpoint: str, input_data: Dict, result: Dict, user_id: str, confidence: float):
        """Save data for continuous learning"""
        try:
            # Save to AILearning table for pattern recognition
            query = """
            INSERT INTO "AILearning" ("analysisType", "inputPattern", "expectedOutput", "actualOutput", "accuracy", "userId", "createdAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """
            
            async with self.pool.acquire() as conn:
                await conn.execute(
                    query,
                    endpoint,
                    json.dumps(input_data),
                    json.dumps(result.get('expected', {})),
                    json.dumps(result),
                    confidence or 0.0,
                    user_id,
                    datetime.utcnow()
                )
                
            logger.info(f"Learning data saved for {endpoint}")
        except Exception as e:
            logger.debug(f"Learning data save failed: {e}")
    
    async def get_continuous_learning_insights(self) -> Dict:
        """Get insights from continuous learning data"""
        try:
            query = """
            SELECT "analysisType", AVG(accuracy) as avg_accuracy, COUNT(*) as sample_count,
                   MAX("createdAt") as last_update
            FROM "AILearning" 
            WHERE "createdAt" >= NOW() - INTERVAL '30 days'
            GROUP BY "analysisType"
            ORDER BY avg_accuracy DESC
            """
            
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query)
                
                insights = {
                    'learning_performance': [],
                    'total_samples': 0,
                    'improvement_trends': {}
                }
                
                for row in rows:
                    insights['learning_performance'].append({
                        'analysis_type': row['analysisType'],
                        'accuracy': float(row['avg_accuracy']),
                        'sample_count': row['sample_count'],
                        'last_update': row['last_update'].isoformat()
                    })
                    insights['total_samples'] += row['sample_count']
                
                return insights
                
        except Exception as e:
            logger.error(f"Failed to get learning insights: {e}")
            return {'learning_performance': [], 'total_samples': 0, 'improvement_trends': {}}
    
    async def get_ai_training_data(self, endpoint: str = None, limit: int = 1000) -> List[Dict]:
        """Get saved AI outputs for retraining and learning"""
        try:
            check_query = """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'AiOutput'
            )
            """
            async with self.pool.acquire() as conn:
                table_exists = await conn.fetchval(check_query)
                
                if not table_exists:
                    return []
                
                if endpoint:
                    query = """
                    SELECT endpoint, "inputData", result, confidence, "createdAt"
                    FROM "AiOutput" 
                    WHERE endpoint = $1
                    ORDER BY "createdAt" DESC
                    LIMIT $2
                    """
                    rows = await conn.fetch(query, endpoint, limit)
                else:
                    query = """
                    SELECT endpoint, "inputData", result, confidence, "createdAt"
                    FROM "AiOutput" 
                    ORDER BY "createdAt" DESC
                    LIMIT $1
                    """
                    rows = await conn.fetch(query, limit)
                
                return [{
                    'endpoint': row['endpoint'],
                    'input_data': json.loads(row['inputData']),
                    'result': json.loads(row['result']),
                    'confidence': row['confidence'],
                    'created_at': row['createdAt']
                } for row in rows]
        except Exception as e:
            logger.error(f"Error fetching AI training data: {e}")
            return []
    
    async def save_prediction_result(self, endpoint: str, input_data: Dict, result: Dict, user_id: str):
        """Legacy method - redirects to save_ai_output"""
        confidence = result.get('confidence', result.get('accuracy', None))
        await self.save_ai_output(endpoint, input_data, result, user_id, confidence)
    
    async def record_analytics_outcome(self, analysis_type: str, prediction: Dict, actual_outcome: Dict, user_id: str):
        """Record actual outcomes for analytics predictions to improve accuracy"""
        try:
            # Calculate accuracy based on prediction vs actual
            accuracy = self.calculate_prediction_accuracy(prediction, actual_outcome, analysis_type)
            
            # Save to PerformanceAnalysis table
            query = """
            INSERT INTO "PerformanceAnalysis" ("userId", "analysisDate", "rootCauses", "bottlenecks", 
                                              "trainingNeeds", "recommendations", "confidence", "aiGenerated")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """
            
            async with self.pool.acquire() as conn:
                await conn.execute(
                    query,
                    user_id,
                    datetime.utcnow(),
                    json.dumps(actual_outcome.get('root_causes', [])),
                    json.dumps(actual_outcome.get('bottlenecks', [])),
                    json.dumps(actual_outcome.get('training_needs', [])),
                    json.dumps(prediction.get('recommendations', [])),
                    accuracy,
                    True
                )
                
            logger.info(f"Analytics outcome recorded: {analysis_type} with {accuracy:.2f} accuracy")
            
        except Exception as e:
            logger.error(f"Failed to record analytics outcome: {e}")
    
    def calculate_prediction_accuracy(self, prediction: Dict, actual: Dict, analysis_type: str) -> float:
        """Calculate accuracy between prediction and actual outcome"""
        try:
            if analysis_type == 'performance_analysis':
                pred_performance = prediction.get('performance', [])
                actual_performance = actual.get('performance', [])
                
                if not pred_performance or not actual_performance:
                    return 0.5
                
                # Calculate accuracy based on performance metrics
                total_accuracy = 0.0
                count = 0
                
                for pred_item in pred_performance:
                    actual_item = next((a for a in actual_performance if a.get('user_id') == pred_item.get('user_id')), None)
                    if actual_item:
                        pred_val = pred_item.get('actual', 0)
                        actual_val = actual_item.get('actual', 0)
                        if actual_val > 0:
                            accuracy = 1.0 - abs(pred_val - actual_val) / actual_val
                            total_accuracy += max(0.0, accuracy)
                            count += 1
                
                return total_accuracy / count if count > 0 else 0.5
                
            elif analysis_type == 'sla_prediction':
                # Calculate SLA prediction accuracy
                pred_risk = prediction.get('risk_score', 0.5)
                actual_breach = actual.get('sla_breached', False)
                
                # High risk prediction should match actual breach
                if (pred_risk > 0.7 and actual_breach) or (pred_risk <= 0.7 and not actual_breach):
                    return 0.9
                else:
                    return 0.3
            
            return 0.5  # Default accuracy
            
        except Exception as e:
            logger.error(f"Accuracy calculation failed: {e}")
            return 0.5

# Global database manager instance
db_manager = None

async def get_db_manager():
    """Get database manager instance"""
    global db_manager
    if db_manager is None:
        # Use actual ARS database connection string - SAME AS BACKEND
        connection_string = "postgresql://postgres:23044943@localhost:5432/ars_db"
        db_manager = DatabaseManager(connection_string)
        await db_manager.initialize()
    return db_manager

async def save_ai_output_global(endpoint: str, input_data: Dict, result: Dict, user_id: str, confidence: float = None):
    """Global function to save AI outputs from anywhere"""
    try:
        db = await get_db_manager()
        await db.save_ai_output(endpoint, input_data, result, user_id, confidence)
    except Exception as e:
        logger.debug(f"Global AI output save failed: {e}")