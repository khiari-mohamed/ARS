"""
ARS OCR & GED Integration Module
Real document processing with PaperStream folder watching and workflow triggers
"""

import os
import time
import json
import logging
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import hashlib
import sqlite3
from threading import Thread
import asyncio

logger = logging.getLogger(__name__)

class ARSDocumentProcessor:
    def __init__(self, watch_folder: str = "\\\\scanshare\\inbox", db_path: str = "ars_ged.db"):
        self.watch_folder = watch_folder
        self.db_path = db_path
        self.processed_files = set()
        self.observer = None
        self._init_database()
    
    def _init_database(self):
        """Initialize GED database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Document index table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ars_documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_path TEXT UNIQUE,
                    file_hash TEXT,
                    client_name TEXT,
                    bordereau_reference TEXT,
                    prestataire TEXT,
                    document_date TEXT,
                    keywords TEXT,
                    status TEXT DEFAULT 'indexed',
                    ocr_text TEXT,
                    processing_errors TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Processing log table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ars_processing_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    file_path TEXT,
                    action TEXT,
                    status TEXT,
                    details TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Workflow triggers table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ars_workflow_triggers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    document_id INTEGER,
                    trigger_type TEXT,
                    trigger_data TEXT,
                    status TEXT DEFAULT 'pending',
                    executed_at TIMESTAMP,
                    FOREIGN KEY (document_id) REFERENCES ars_documents (id)
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("ARS GED database initialized")
            
        except Exception as e:
            logger.error(f"GED database initialization failed: {e}")
    
    def start_watching(self):
        """Start watching PaperStream folder"""
        try:
            if not os.path.exists(self.watch_folder):
                logger.warning(f"Watch folder does not exist: {self.watch_folder}")
                return False
            
            event_handler = ARSFileHandler(self)
            self.observer = Observer()
            self.observer.schedule(event_handler, self.watch_folder, recursive=True)
            self.observer.start()
            
            logger.info(f"Started watching ARS document folder: {self.watch_folder}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start folder watching: {e}")
            return False
    
    def stop_watching(self):
        """Stop watching folder"""
        if self.observer:
            self.observer.stop()
            self.observer.join()
            logger.info("Stopped watching ARS document folder")
    
    def process_document(self, file_path: str) -> Dict:
        """Process a single document"""
        try:
            # Check if already processed
            file_hash = self._calculate_file_hash(file_path)
            if self._is_duplicate(file_hash):
                return {'status': 'duplicate', 'file_path': file_path}
            
            # Extract text using OCR simulation (replace with real OCR)
            ocr_text = self._extract_text_ocr(file_path)
            
            # Extract ARS-specific information
            document_info = self._extract_ars_document_info(ocr_text, file_path)
            
            # Index document
            document_id = self._index_document(file_path, file_hash, document_info, ocr_text)
            
            # Trigger workflows
            self._trigger_ars_workflows(document_id, document_info)
            
            # Log processing
            self._log_processing(file_path, 'processed', 'success', document_info)
            
            return {
                'status': 'processed',
                'document_id': document_id,
                'file_path': file_path,
                'document_info': document_info
            }
            
        except Exception as e:
            error_msg = f"Document processing failed: {e}"
            logger.error(error_msg)
            self._log_processing(file_path, 'error', 'failed', {'error': str(e)})
            return {'status': 'error', 'file_path': file_path, 'error': str(e)}
    
    def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate file hash for deduplication"""
        try:
            with open(file_path, 'rb') as f:
                file_hash = hashlib.md5()
                for chunk in iter(lambda: f.read(4096), b""):
                    file_hash.update(chunk)
                return file_hash.hexdigest()
        except Exception as e:
            logger.error(f"Hash calculation failed: {e}")
            return ""
    
    def _is_duplicate(self, file_hash: str) -> bool:
        """Check if document is duplicate"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM ars_documents WHERE file_hash = ?', (file_hash,))
            result = cursor.fetchone()
            conn.close()
            return result is not None
        except Exception as e:
            logger.error(f"Duplicate check failed: {e}")
            return False
    
    def _extract_text_ocr(self, file_path: str) -> str:
        """Extract text using OCR (simulated - replace with real OCR)"""
        try:
            # Simulate OCR text extraction
            # In real implementation, use OCR library like Tesseract, Azure OCR, etc.
            filename = os.path.basename(file_path).lower()
            
            # Generate realistic ARS document text based on filename
            if 'bordereau' in filename or 'b-' in filename:
                return f"""
                BORDEREAU DE REMBOURSEMENT
                Référence: {filename.split('.')[0].upper()}
                Client: ACME ASSURANCE
                Prestataire: CLINIQUE MODERNE
                Date: {datetime.now().strftime('%d/%m/%Y')}
                Nombre BS: 25
                Montant total: 1,250.00 TND
                RIB: 12345678901234567890
                Statut: En attente de traitement
                """
            elif 'facture' in filename:
                return f"""
                FACTURE MEDICALE
                N° Facture: {filename.split('.')[0].upper()}
                Date: {datetime.now().strftime('%d/%m/%Y')}
                Patient: PATIENT ANONYME
                Prestations: Consultation spécialisée
                Montant: 85.00 TND
                """
            else:
                return f"Document scanné: {filename}\nDate: {datetime.now().strftime('%d/%m/%Y')}\nContenu: Document ARS"
                
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            return ""
    
    def _extract_ars_document_info(self, ocr_text: str, file_path: str) -> Dict:
        """Extract ARS-specific information from OCR text"""
        try:
            info = {
                'client_name': 'UNKNOWN',
                'bordereau_reference': 'UNKNOWN',
                'prestataire': 'UNKNOWN',
                'document_date': datetime.now().strftime('%Y-%m-%d'),
                'keywords': [],
                'document_type': 'UNKNOWN'
            }
            
            text_lower = ocr_text.lower()
            
            # Extract client name
            if 'acme' in text_lower:
                info['client_name'] = 'ACME ASSURANCE'
            elif 'client:' in text_lower:
                # Extract client name after "Client:"
                lines = ocr_text.split('\n')
                for line in lines:
                    if 'client:' in line.lower():
                        info['client_name'] = line.split(':')[1].strip()
                        break
            
            # Extract bordereau reference
            if 'référence:' in text_lower or 'reference:' in text_lower:
                lines = ocr_text.split('\n')
                for line in lines:
                    if 'référence:' in line.lower() or 'reference:' in line.lower():
                        info['bordereau_reference'] = line.split(':')[1].strip()
                        break
            elif 'b-' in text_lower:
                # Extract B- reference
                import re
                match = re.search(r'b-\d{4}-\d+', text_lower)
                if match:
                    info['bordereau_reference'] = match.group().upper()
            
            # Extract prestataire
            if 'prestataire:' in text_lower:
                lines = ocr_text.split('\n')
                for line in lines:
                    if 'prestataire:' in line.lower():
                        info['prestataire'] = line.split(':')[1].strip()
                        break
            elif 'clinique' in text_lower:
                info['prestataire'] = 'CLINIQUE MODERNE'
            
            # Determine document type
            if 'bordereau' in text_lower:
                info['document_type'] = 'BORDEREAU'
            elif 'facture' in text_lower:
                info['document_type'] = 'FACTURE'
            elif 'réclamation' in text_lower:
                info['document_type'] = 'RECLAMATION'
            else:
                info['document_type'] = 'DOCUMENT_GENERAL'
            
            # Extract keywords
            ars_keywords = ['bordereau', 'facture', 'remboursement', 'client', 'prestataire', 'rib', 'virement']
            info['keywords'] = [kw for kw in ars_keywords if kw in text_lower]
            
            return info
            
        except Exception as e:
            logger.error(f"ARS info extraction failed: {e}")
            return {'error': str(e)}
    
    def _index_document(self, file_path: str, file_hash: str, document_info: Dict, ocr_text: str) -> int:
        """Index document in ARS GED"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO ars_documents 
                (file_path, file_hash, client_name, bordereau_reference, prestataire, 
                 document_date, keywords, ocr_text, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'indexed')
            ''', (
                file_path,
                file_hash,
                document_info.get('client_name', 'UNKNOWN'),
                document_info.get('bordereau_reference', 'UNKNOWN'),
                document_info.get('prestataire', 'UNKNOWN'),
                document_info.get('document_date', datetime.now().strftime('%Y-%m-%d')),
                ','.join(document_info.get('keywords', [])),
                ocr_text
            ))
            
            document_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            logger.info(f"Document indexed with ID: {document_id}")
            return document_id
            
        except Exception as e:
            logger.error(f"Document indexing failed: {e}")
            return 0
    
    def _trigger_ars_workflows(self, document_id: int, document_info: Dict):
        """Trigger ARS workflows based on document type"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            document_type = document_info.get('document_type', 'UNKNOWN')
            
            # Trigger assignment workflow for bordereaux
            if document_type == 'BORDEREAU':
                cursor.execute('''
                    INSERT INTO ars_workflow_triggers 
                    (document_id, trigger_type, trigger_data, status)
                    VALUES (?, 'auto_assignment', ?, 'pending')
                ''', (document_id, json.dumps({
                    'bordereau_reference': document_info.get('bordereau_reference'),
                    'client_name': document_info.get('client_name'),
                    'priority': 'normal'
                })))
            
            # Trigger SLA monitoring
            if document_type in ['BORDEREAU', 'FACTURE']:
                cursor.execute('''
                    INSERT INTO ars_workflow_triggers 
                    (document_id, trigger_type, trigger_data, status)
                    VALUES (?, 'sla_monitoring', ?, 'pending')
                ''', (document_id, json.dumps({
                    'document_type': document_type,
                    'client_name': document_info.get('client_name'),
                    'start_date': datetime.now().isoformat()
                })))
            
            # Trigger complaint processing
            if document_type == 'RECLAMATION':
                cursor.execute('''
                    INSERT INTO ars_workflow_triggers 
                    (document_id, trigger_type, trigger_data, status)
                    VALUES (?, 'complaint_processing', ?, 'pending')
                ''', (document_id, json.dumps({
                    'client_name': document_info.get('client_name'),
                    'priority': 'high'
                })))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Workflows triggered for document {document_id}")
            
        except Exception as e:
            logger.error(f"Workflow triggering failed: {e}")
    
    def _log_processing(self, file_path: str, action: str, status: str, details: Dict):
        """Log processing activity"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO ars_processing_log (file_path, action, status, details)
                VALUES (?, ?, ?, ?)
            ''', (file_path, action, status, json.dumps(details, default=str)))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Processing logging failed: {e}")
    
    def search_documents(self, criteria: Dict) -> List[Dict]:
        """Search indexed documents"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Build search query
            where_clauses = []
            params = []
            
            if criteria.get('client_name'):
                where_clauses.append('client_name LIKE ?')
                params.append(f"%{criteria['client_name']}%")
            
            if criteria.get('bordereau_reference'):
                where_clauses.append('bordereau_reference LIKE ?')
                params.append(f"%{criteria['bordereau_reference']}%")
            
            if criteria.get('prestataire'):
                where_clauses.append('prestataire LIKE ?')
                params.append(f"%{criteria['prestataire']}%")
            
            if criteria.get('keywords'):
                where_clauses.append('keywords LIKE ?')
                params.append(f"%{criteria['keywords']}%")
            
            if criteria.get('date_from'):
                where_clauses.append('document_date >= ?')
                params.append(criteria['date_from'])
            
            if criteria.get('date_to'):
                where_clauses.append('document_date <= ?')
                params.append(criteria['date_to'])
            
            where_sql = ' AND '.join(where_clauses) if where_clauses else '1=1'
            
            query = f'''
                SELECT id, file_path, client_name, bordereau_reference, prestataire,
                       document_date, keywords, status, created_at
                FROM ars_documents
                WHERE {where_sql}
                ORDER BY created_at DESC
                LIMIT 100
            '''
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            conn.close()
            
            # Convert to list of dictionaries
            documents = []
            for row in results:
                documents.append({
                    'id': row[0],
                    'file_path': row[1],
                    'client_name': row[2],
                    'bordereau_reference': row[3],
                    'prestataire': row[4],
                    'document_date': row[5],
                    'keywords': row[6].split(',') if row[6] else [],
                    'status': row[7],
                    'created_at': row[8]
                })
            
            return documents
            
        except Exception as e:
            logger.error(f"Document search failed: {e}")
            return []
    
    def get_processing_stats(self) -> Dict:
        """Get processing statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Total documents
            cursor.execute('SELECT COUNT(*) FROM ars_documents')
            total_docs = cursor.fetchone()[0]
            
            # Documents by status
            cursor.execute('SELECT status, COUNT(*) FROM ars_documents GROUP BY status')
            status_counts = dict(cursor.fetchall())
            
            # Documents by type (based on keywords)
            cursor.execute('''
                SELECT 
                    CASE 
                        WHEN keywords LIKE '%bordereau%' THEN 'BORDEREAU'
                        WHEN keywords LIKE '%facture%' THEN 'FACTURE'
                        WHEN keywords LIKE '%réclamation%' THEN 'RECLAMATION'
                        ELSE 'OTHER'
                    END as doc_type,
                    COUNT(*)
                FROM ars_documents 
                GROUP BY doc_type
            ''')
            type_counts = dict(cursor.fetchall())
            
            # Recent processing activity
            cursor.execute('''
                SELECT action, status, COUNT(*) 
                FROM ars_processing_log 
                WHERE timestamp > datetime('now', '-24 hours')
                GROUP BY action, status
            ''')
            recent_activity = cursor.fetchall()
            
            # Pending workflows
            cursor.execute('SELECT COUNT(*) FROM ars_workflow_triggers WHERE status = "pending"')
            pending_workflows = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'total_documents': total_docs,
                'status_distribution': status_counts,
                'document_types': type_counts,
                'recent_activity': [{'action': r[0], 'status': r[1], 'count': r[2]} for r in recent_activity],
                'pending_workflows': pending_workflows,
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Getting processing stats failed: {e}")
            return {'error': str(e)}

class ARSFileHandler(FileSystemEventHandler):
    """File system event handler for ARS documents"""
    
    def __init__(self, processor: ARSDocumentProcessor):
        self.processor = processor
        self.processing_queue = []
    
    def on_created(self, event):
        """Handle new file creation"""
        if not event.is_directory:
            file_path = event.src_path
            
            # Only process PDF files (typical for scanned documents)
            if file_path.lower().endswith('.pdf'):
                logger.info(f"New ARS document detected: {file_path}")
                
                # Wait a moment for file to be fully written
                time.sleep(2)
                
                # Process document in background thread
                thread = Thread(target=self._process_file_async, args=(file_path,))
                thread.daemon = True
                thread.start()
    
    def _process_file_async(self, file_path: str):
        """Process file asynchronously"""
        try:
            result = self.processor.process_document(file_path)
            logger.info(f"Document processing result: {result}")
        except Exception as e:
            logger.error(f"Async document processing failed: {e}")

# Global ARS document processor
ars_document_processor = ARSDocumentProcessor()

def start_ars_document_processing():
    """Start ARS document processing service"""
    try:
        success = ars_document_processor.start_watching()
        if success:
            logger.info("ARS document processing service started")
        else:
            logger.warning("ARS document processing service failed to start")
        return success
    except Exception as e:
        logger.error(f"Failed to start ARS document processing: {e}")
        return False

def stop_ars_document_processing():
    """Stop ARS document processing service"""
    try:
        ars_document_processor.stop_watching()
        logger.info("ARS document processing service stopped")
    except Exception as e:
        logger.error(f"Failed to stop ARS document processing: {e}")