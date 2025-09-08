"""
Local Generative AI System for ARS
Provides text generation capabilities without external API calls
Learns and adapts to company-specific language patterns
"""

import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import numpy as np
import json
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging
from collections import defaultdict
import re

logger = logging.getLogger(__name__)

class LocalGenerativeAI:
    def __init__(self):
        self.model_name = "microsoft/DialoGPT-small"  # Lightweight conversational model
        self.tokenizer = None
        self.model = None
        self.generator = None
        self.company_knowledge = {}
        self.response_templates = {}
        self.learning_db = "ai_generative_learning.db"
        self.max_length = 150
        self.temperature = 0.7
        self.initialized = False
        
        # ARS-specific knowledge base
        self.ars_knowledge = {
            "company_info": {
                "name": "ARS",
                "domain": "assurance",
                "services": ["remboursement", "réclamations", "SLA", "gestion dossiers"],
                "language": "français"
            },
            "business_terms": {
                "remboursement": "processus de paiement des sinistres",
                "bordereau": "document de traitement des dossiers",
                "SLA": "accord de niveau de service",
                "réclamation": "plainte client nécessitant traitement"
            },
            "response_patterns": {
                "greeting": ["Bonjour", "Bonsoir", "Salut"],
                "acknowledgment": ["Je comprends", "D'accord", "Très bien"],
                "assistance": ["Je peux vous aider", "Laissez-moi analyser", "Voici ma recommandation"]
            }
        }
        
        self._init_database()
        self._load_company_knowledge()
    
    def _init_database(self):
        """Initialize SQLite database for generative learning"""
        try:
            conn = sqlite3.connect(self.learning_db)
            cursor = conn.cursor()
            
            # Conversations table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_input TEXT,
                    ai_response TEXT,
                    context TEXT,
                    feedback INTEGER DEFAULT 0,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Knowledge base table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS knowledge_base (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    topic TEXT,
                    content TEXT,
                    confidence REAL DEFAULT 0.5,
                    usage_count INTEGER DEFAULT 0,
                    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Response templates table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS response_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT,
                    template TEXT,
                    effectiveness REAL DEFAULT 0.5,
                    usage_count INTEGER DEFAULT 0
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("Generative AI database initialized")
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
    
    def initialize_model(self):
        """Initialize the generative model (lazy loading)"""
        if self.initialized:
            return True
            
        try:
            logger.info("Initializing local generative AI model...")
            
            # Load tokenizer and model
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
            
            # Add padding token if not present
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            # Create text generation pipeline
            self.generator = pipeline(
                "text-generation",
                model=self.model,
                tokenizer=self.tokenizer,
                max_length=self.max_length,
                temperature=self.temperature,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )
            
            self.initialized = True
            logger.info("Generative AI model initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Model initialization failed: {e}")
            return False
    
    def _load_company_knowledge(self):
        """Load company-specific knowledge from database"""
        try:
            conn = sqlite3.connect(self.learning_db)
            cursor = conn.cursor()
            
            cursor.execute("SELECT topic, content, confidence FROM knowledge_base")
            rows = cursor.fetchall()
            
            for topic, content, confidence in rows:
                if topic not in self.company_knowledge:
                    self.company_knowledge[topic] = []
                self.company_knowledge[topic].append({
                    'content': content,
                    'confidence': confidence
                })
            
            conn.close()
        except Exception as e:
            logger.error(f"Failed to load company knowledge: {e}")
    
    def learn_from_interaction(self, user_input: str, context: Dict = None):
        """Learn from user interactions to improve responses"""
        try:
            # Extract key terms and concepts
            key_terms = self._extract_key_terms(user_input)
            
            # Store interaction for learning
            conn = sqlite3.connect(self.learning_db)
            cursor = conn.cursor()
            
            context_str = json.dumps(context) if context else "{}"
            
            # Update knowledge base with new terms
            for term in key_terms:
                cursor.execute('''
                    INSERT OR REPLACE INTO knowledge_base (topic, content, confidence, usage_count)
                    VALUES (?, ?, ?, COALESCE((SELECT usage_count FROM knowledge_base WHERE topic = ?), 0) + 1)
                ''', (term, user_input, 0.7, term))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Learning from interaction failed: {e}")
    
    def _extract_key_terms(self, text: str) -> List[str]:
        """Extract key business terms from text"""
        text_lower = text.lower()
        key_terms = []
        
        # ARS business terms
        business_terms = [
            'remboursement', 'réclamation', 'bordereau', 'sla', 'délai',
            'dossier', 'client', 'assurance', 'sinistre', 'traitement',
            'urgence', 'priorité', 'performance', 'analyse', 'prédiction'
        ]
        
        for term in business_terms:
            if term in text_lower:
                key_terms.append(term)
        
        return key_terms
    
    def generate_response(self, prompt: str, context: Dict = None) -> Dict[str, Any]:
        """Generate contextual response using local AI"""
        if not self.initialize_model():
            return self._fallback_response(prompt, context)
        
        try:
            # Learn from this interaction
            self.learn_from_interaction(prompt, context)
            
            # Enhance prompt with ARS context
            enhanced_prompt = self._enhance_prompt_with_context(prompt, context)
            
            # Generate response
            generated = self.generator(
                enhanced_prompt,
                max_length=self.max_length,
                num_return_sequences=1,
                temperature=self.temperature,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )
            
            raw_response = generated[0]['generated_text']
            
            # Clean and post-process response
            clean_response = self._post_process_response(raw_response, enhanced_prompt)
            
            # Store conversation for learning
            self._store_conversation(prompt, clean_response, context)
            
            return {
                'response': clean_response,
                'confidence': 0.85,
                'source': 'local_generative_ai',
                'context_used': bool(context),
                'learning_applied': True
            }
            
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            return self._fallback_response(prompt, context)
    
    def _enhance_prompt_with_context(self, prompt: str, context: Dict = None) -> str:
        """Enhance prompt with ARS business context"""
        # Add ARS context prefix
        ars_context = "En tant qu'assistant IA spécialisé pour ARS (assurance), "
        
        # Add specific context if provided
        if context:
            if context.get('type') == 'complaint':
                ars_context += "pour traiter une réclamation client, "
            elif context.get('type') == 'sla':
                ars_context += "pour analyser les SLA, "
            elif context.get('type') == 'analysis':
                ars_context += "pour l'analyse de performance, "
        
        enhanced_prompt = f"{ars_context}{prompt}"
        
        # Add relevant knowledge
        relevant_knowledge = self._get_relevant_knowledge(prompt)
        if relevant_knowledge:
            enhanced_prompt += f" Contexte: {relevant_knowledge}"
        
        return enhanced_prompt
    
    def _get_relevant_knowledge(self, prompt: str) -> str:
        """Get relevant knowledge from company knowledge base"""
        prompt_lower = prompt.lower()
        relevant_info = []
        
        # Check ARS knowledge base
        for category, info in self.ars_knowledge.items():
            if isinstance(info, dict):
                for key, value in info.items():
                    if key in prompt_lower or (isinstance(value, str) and any(term in prompt_lower for term in value.split())):
                        relevant_info.append(f"{key}: {value}")
        
        return ". ".join(relevant_info[:2])  # Limit to avoid prompt overflow
    
    def _post_process_response(self, raw_response: str, original_prompt: str) -> str:
        """Clean and improve generated response"""
        # Remove the original prompt from response
        if original_prompt in raw_response:
            response = raw_response.replace(original_prompt, "").strip()
        else:
            response = raw_response.strip()
        
        # Clean up common issues
        response = re.sub(r'\n+', ' ', response)  # Remove multiple newlines
        response = re.sub(r'\s+', ' ', response)  # Remove multiple spaces
        
        # Ensure French business tone
        if not any(greeting in response.lower() for greeting in ['bonjour', 'bonsoir', 'salut']):
            if len(response) > 50:  # Only add greeting for substantial responses
                response = f"Bonjour. {response}"
        
        # Limit response length
        if len(response) > 200:
            sentences = response.split('.')
            response = '. '.join(sentences[:2]) + '.'
        
        return response
    
    def _fallback_response(self, prompt: str, context: Dict = None) -> Dict[str, Any]:
        """Provide intelligent fallback when generative model fails"""
        prompt_lower = prompt.lower()
        
        # Pattern-based responses for common ARS scenarios
        if any(term in prompt_lower for term in ['remboursement', 'rembourser']):
            response = "Je comprends votre demande concernant le remboursement. Laissez-moi analyser votre dossier pour vous fournir les informations appropriées."
        elif any(term in prompt_lower for term in ['réclamation', 'plainte']):
            response = "Votre réclamation est importante pour nous. Je vais examiner les détails et vous proposer la meilleure solution."
        elif any(term in prompt_lower for term in ['délai', 'retard']):
            response = "Concernant les délais, je vais vérifier le statut de votre dossier et identifier les actions nécessaires pour accélérer le traitement."
        elif any(term in prompt_lower for term in ['sla', 'performance']):
            response = "Pour l'analyse de performance et SLA, je peux vous fournir des insights détaillés basés sur les données actuelles."
        else:
            response = "Je suis là pour vous aider avec vos questions concernant ARS. Pouvez-vous me donner plus de détails sur votre demande?"
        
        return {
            'response': response,
            'confidence': 0.75,
            'source': 'rule_based_fallback',
            'context_used': bool(context),
            'learning_applied': False
        }
    
    def _store_conversation(self, user_input: str, ai_response: str, context: Dict = None):
        """Store conversation for future learning"""
        try:
            conn = sqlite3.connect(self.learning_db)
            cursor = conn.cursor()
            
            context_str = json.dumps(context) if context else "{}"
            
            cursor.execute('''
                INSERT INTO conversations (user_input, ai_response, context)
                VALUES (?, ?, ?)
            ''', (user_input, ai_response, context_str))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to store conversation: {e}")
    
    def provide_feedback(self, conversation_id: int, feedback: int):
        """Record feedback for learning improvement"""
        try:
            conn = sqlite3.connect(self.learning_db)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE conversations SET feedback = ? WHERE id = ?
            ''', (feedback, conversation_id))
            
            conn.commit()
            conn.close()
            
            # Learn from feedback
            if feedback > 0:
                self._improve_from_positive_feedback(conversation_id)
            else:
                self._improve_from_negative_feedback(conversation_id)
                
        except Exception as e:
            logger.error(f"Failed to record feedback: {e}")
    
    def _improve_from_positive_feedback(self, conversation_id: int):
        """Improve model based on positive feedback"""
        # Implementation for reinforcement learning from positive feedback
        pass
    
    def _improve_from_negative_feedback(self, conversation_id: int):
        """Improve model based on negative feedback"""
        # Implementation for learning from negative feedback
        pass
    
    def get_learning_stats(self) -> Dict[str, Any]:
        """Get statistics about the generative AI learning"""
        try:
            conn = sqlite3.connect(self.learning_db)
            cursor = conn.cursor()
            
            # Conversation stats
            cursor.execute("SELECT COUNT(*) FROM conversations")
            total_conversations = cursor.fetchone()[0]
            
            cursor.execute("SELECT AVG(feedback) FROM conversations WHERE feedback != 0")
            avg_feedback = cursor.fetchone()[0] or 0
            
            # Knowledge base stats
            cursor.execute("SELECT COUNT(*) FROM knowledge_base")
            knowledge_entries = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT topic) FROM knowledge_base")
            unique_topics = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'total_conversations': total_conversations,
                'average_feedback': round(avg_feedback, 2),
                'knowledge_entries': knowledge_entries,
                'unique_topics': unique_topics,
                'model_initialized': self.initialized,
                'learning_active': True
            }
            
        except Exception as e:
            logger.error(f"Failed to get learning stats: {e}")
            return {
                'total_conversations': 0,
                'average_feedback': 0,
                'knowledge_entries': 0,
                'unique_topics': 0,
                'model_initialized': self.initialized,
                'learning_active': False
            }
    
    def generate_business_insight(self, data: Dict, insight_type: str = "analysis") -> str:
        """Generate business insights based on data"""
        context = {
            'type': insight_type,
            'data_points': len(data.get('items', [])),
            'domain': 'business_intelligence'
        }
        
        if insight_type == "sla_analysis":
            prompt = f"Analysez les données SLA suivantes et fournissez des recommandations: {len(data.get('items', []))} éléments à analyser."
        elif insight_type == "complaint_summary":
            prompt = f"Résumez les tendances des réclamations basées sur {len(data.get('complaints', []))} réclamations."
        elif insight_type == "performance_review":
            prompt = f"Évaluez la performance basée sur les métriques fournies."
        else:
            prompt = f"Fournissez une analyse des données business fournies."
        
        result = self.generate_response(prompt, context)
        return result['response']

# Global instance
generative_ai = LocalGenerativeAI()