"""
Real ARS Complaints Intelligence Module
Transforms generic complaints analysis into ARS-specific business intelligence
"""

from typing import Dict, List, Any
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import logging

logger = logging.getLogger(__name__)

async def generate_complaints_intelligence(complaints: List[Dict], db_manager) -> Dict:
    """Generate comprehensive complaints intelligence for ARS"""
    try:
        # Classification and recurrence detection
        classification_results = classify_ars_complaints(complaints)
        
        # Recurrence and anomaly detection
        recurrence_analysis = detect_complaint_recurrence(complaints)
        anomaly_analysis = detect_complaint_anomalies(complaints)
        
        # Correlation analysis
        correlation_analysis = await analyze_complaint_correlations(complaints, db_manager)
        
        # Performance ranking
        performance_ranking = await rank_complaint_handling_performance(complaints, db_manager)
        
        # Auto-reply suggestions
        auto_reply_suggestions = await generate_auto_reply_suggestions(complaints)
        
        return {
            'insights': {
                'classification_summary': classification_results,
                'recurrence_analysis': recurrence_analysis,
                'anomaly_detection': anomaly_analysis,
                'correlation_analysis': correlation_analysis
            },
            'performance_ranking': performance_ranking,
            'auto_replies': auto_reply_suggestions,
            'summary': {
                'total_complaints': len(complaints),
                'analysis_period': 'Last 30 days',
                'key_findings': generate_key_findings(classification_results, recurrence_analysis, anomaly_analysis)
            }
        }
        
    except Exception as e:
        logger.error(f"Complaints intelligence generation failed: {e}")
        return {'error': str(e)}

def classify_ars_complaints(complaints: List[Dict]) -> Dict:
    """Classify complaints using ARS-specific categories"""
    try:
        categories = defaultdict(int)
        severity_distribution = defaultdict(int)
        department_distribution = defaultdict(int)
        
        for complaint in complaints:
            # Extract complaint details
            description = complaint.get('description', '').lower()
            complaint_type = complaint.get('type', 'UNKNOWN')
            severity = complaint.get('severity', 'medium')
            department = complaint.get('department', 'UNKNOWN')
            
            # ARS-specific classification
            if not complaint_type or complaint_type == 'UNKNOWN':
                complaint_type = classify_by_content(description)
            
            categories[complaint_type] += 1
            severity_distribution[severity] += 1
            department_distribution[department] += 1
        
        return {
            'top_categories': dict(Counter(categories).most_common(5)),
            'severity_distribution': dict(severity_distribution),
            'department_distribution': dict(department_distribution),
            'total_classified': len(complaints)
        }
        
    except Exception as e:
        logger.error(f"Complaint classification failed: {e}")
        return {'error': str(e)}

def classify_by_content(description: str) -> str:
    """Classify complaint by content analysis"""
    description_lower = description.lower()
    
    # ARS-specific keywords
    if any(word in description_lower for word in ['rib', 'virement', 'paiement', 'remboursement']):
        return 'RIB_INVALIDE'
    elif any(word in description_lower for word in ['retard', 'délai', 'attente', 'lent']):
        return 'RETARD_VIREMENT'
    elif any(word in description_lower for word in ['erreur', 'incorrect', 'faux', 'mauvais']):
        return 'ERREUR_DOSSIER'
    elif any(word in description_lower for word in ['service', 'accueil', 'personnel']):
        return 'QUALITE_SERVICE'
    elif any(word in description_lower for word in ['technique', 'site', 'application']):
        return 'PROBLEME_TECHNIQUE'
    else:
        return 'AUTRE'

def detect_complaint_recurrence(complaints: List[Dict]) -> Dict:
    """Detect recurring complaint patterns"""
    try:
        # Group by type and analyze frequency
        type_timeline = defaultdict(list)
        
        for complaint in complaints:
            complaint_type = complaint.get('type', classify_by_content(complaint.get('description', '')))
            created_at = complaint.get('created_at', datetime.now())
            
            if isinstance(created_at, str):
                try:
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00').replace('+00:00', ''))
                except:
                    created_at = datetime.now()
            
            type_timeline[complaint_type].append(created_at)
        
        # Analyze recurrence patterns
        recurrent_types = []
        for complaint_type, timestamps in type_timeline.items():
            if len(timestamps) >= 3:  # At least 3 occurrences
                # Calculate frequency
                timestamps.sort()
                time_diffs = [(timestamps[i+1] - timestamps[i]).days for i in range(len(timestamps)-1)]
                avg_interval = sum(time_diffs) / len(time_diffs) if time_diffs else 0
                
                # Determine trend
                recent_count = len([t for t in timestamps if (datetime.now() - t).days <= 7])
                total_count = len(timestamps)
                trend = 'up' if recent_count > total_count * 0.3 else 'stable' if recent_count > total_count * 0.1 else 'down'
                
                recurrent_types.append({
                    'type': complaint_type,
                    'count': total_count,
                    'avg_interval_days': round(avg_interval, 1),
                    'trend': trend,
                    'recent_occurrences': recent_count
                })
        
        # Sort by count
        recurrent_types.sort(key=lambda x: x['count'], reverse=True)
        
        return {
            'top_recurrent_types': recurrent_types[:5],
            'total_recurrent_patterns': len(recurrent_types),
            'analysis_summary': f'Detected {len(recurrent_types)} recurring complaint patterns'
        }
        
    except Exception as e:
        logger.error(f"Recurrence detection failed: {e}")
        return {'error': str(e)}

def detect_complaint_anomalies(complaints: List[Dict]) -> Dict:
    """Detect anomalies in complaint patterns"""
    try:
        # Analyze daily complaint volumes
        daily_counts = defaultdict(int)
        
        for complaint in complaints:
            created_at = complaint.get('created_at', datetime.now())
            if isinstance(created_at, str):
                try:
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00').replace('+00:00', ''))
                except:
                    created_at = datetime.now()
            
            date_key = created_at.strftime('%Y-%m-%d')
            daily_counts[date_key] += 1
        
        # Calculate statistics
        counts = list(daily_counts.values())
        if not counts:
            return {'anomalies': [], 'summary': 'No data for anomaly detection'}
        
        mean_count = sum(counts) / len(counts)
        std_count = (sum([(x - mean_count) ** 2 for x in counts]) / len(counts)) ** 0.5
        
        # Detect anomalies (values > 2 standard deviations from mean)
        anomalies = []
        threshold = mean_count + 2 * std_count
        
        for date, count in daily_counts.items():
            if count > threshold:
                anomalies.append({
                    'date': date,
                    'complaint_count': count,
                    'expected_range': f'{mean_count:.1f} ± {std_count:.1f}',
                    'severity': 'high' if count > mean_count + 3 * std_count else 'medium'
                })
        
        return {
            'anomalies': sorted(anomalies, key=lambda x: x['complaint_count'], reverse=True),
            'baseline_stats': {
                'daily_average': round(mean_count, 1),
                'daily_std_dev': round(std_count, 1),
                'anomaly_threshold': round(threshold, 1)
            },
            'summary': f'Detected {len(anomalies)} anomalous days'
        }
        
    except Exception as e:
        logger.error(f"Anomaly detection failed: {e}")
        return {'error': str(e)}

async def analyze_complaint_correlations(complaints: List[Dict], db_manager) -> Dict:
    """Analyze correlations between complaints and processes/documents"""
    try:
        # Correlation with process steps
        process_correlations = defaultdict(lambda: defaultdict(int))
        
        # Correlation with departments
        department_correlations = defaultdict(lambda: defaultdict(int))
        
        for complaint in complaints:
            complaint_type = complaint.get('type', classify_by_content(complaint.get('description', '')))
            process_id = complaint.get('process_id')
            department = complaint.get('department', 'UNKNOWN')
            
            # Process correlation
            if process_id:
                process_correlations[complaint_type][process_id] += 1
            
            # Department correlation
            department_correlations[complaint_type][department] += 1
        
        # Calculate significant correlations
        significant_correlations = []
        
        # Process correlations
        for complaint_type, processes in process_correlations.items():
            total_complaints = sum(processes.values())
            for process_id, count in processes.items():
                if count >= 3 and count / total_complaints > 0.3:  # At least 30% correlation
                    significant_correlations.append({
                        'complaint_type': complaint_type,
                        'correlated_with': f'Process {process_id}',
                        'correlation_strength': count / total_complaints,
                        'occurrences': count,
                        'p_value': calculate_simple_p_value(count, total_complaints)
                    })
        
        # Department correlations
        for complaint_type, departments in department_correlations.items():
            total_complaints = sum(departments.values())
            for department, count in departments.items():
                if count >= 3 and count / total_complaints > 0.4:  # At least 40% correlation
                    significant_correlations.append({
                        'complaint_type': complaint_type,
                        'correlated_with': f'Department {department}',
                        'correlation_strength': count / total_complaints,
                        'occurrences': count,
                        'p_value': calculate_simple_p_value(count, total_complaints)
                    })
        
        # Sort by correlation strength
        significant_correlations.sort(key=lambda x: x['correlation_strength'], reverse=True)
        
        return {
            'significant_correlations': significant_correlations[:10],
            'process_breakdown': dict(process_correlations),
            'department_breakdown': dict(department_correlations),
            'summary': f'Found {len(significant_correlations)} significant correlations'
        }
        
    except Exception as e:
        logger.error(f"Correlation analysis failed: {e}")
        return {'error': str(e)}

async def rank_complaint_handling_performance(complaints: List[Dict], db_manager) -> List[Dict]:
    """Rank departments/agents by complaint handling performance"""
    try:
        # Get agent performance data
        agents = await db_manager.get_agent_performance_metrics()
        
        # Analyze complaint handling by assigned agent/team
        handler_performance = defaultdict(lambda: {
            'total_handled': 0,
            'avg_resolution_time': 0,
            'satisfaction_score': 0,
            'complaints_resolved': 0
        })
        
        for complaint in complaints:
            assigned_to = complaint.get('assignedToId')
            status = complaint.get('status', 'open')
            created_at = complaint.get('created_at', datetime.now())
            
            if assigned_to:
                handler_performance[assigned_to]['total_handled'] += 1
                
                if status in ['resolved', 'closed']:
                    handler_performance[assigned_to]['complaints_resolved'] += 1
                    
                    # Calculate resolution time (simplified)
                    if isinstance(created_at, str):
                        try:
                            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00').replace('+00:00', ''))
                        except:
                            created_at = datetime.now()
                    
                    resolution_time = (datetime.now() - created_at).days
                    handler_performance[assigned_to]['avg_resolution_time'] += resolution_time
        
        # Calculate final metrics and rank
        performance_ranking = []
        
        for handler_id, metrics in handler_performance.items():
            if metrics['total_handled'] > 0:
                resolution_rate = metrics['complaints_resolved'] / metrics['total_handled']
                avg_resolution_days = metrics['avg_resolution_time'] / max(metrics['complaints_resolved'], 1)
                
                # Find agent name
                agent_name = 'Unknown'
                agent = next((a for a in agents if a['id'] == handler_id), None)
                if agent:
                    agent_name = f"{agent.get('firstName', '')} {agent.get('lastName', '')}".strip()
                
                # Calculate performance score (higher is better)
                performance_score = (resolution_rate * 0.6) + ((10 - min(avg_resolution_days, 10)) / 10 * 0.4)
                
                performance_ranking.append({
                    'handler_id': handler_id,
                    'handler_name': agent_name,
                    'total_complaints': metrics['total_handled'],
                    'resolution_rate': round(resolution_rate, 3),
                    'avg_resolution_days': round(avg_resolution_days, 1),
                    'performance_score': round(performance_score, 3),
                    'rank': 0  # Will be set after sorting
                })
        
        # Sort by performance score and assign ranks
        performance_ranking.sort(key=lambda x: x['performance_score'], reverse=True)
        for i, handler in enumerate(performance_ranking):
            handler['rank'] = i + 1
        
        return performance_ranking[:10]  # Top 10 performers
        
    except Exception as e:
        logger.error(f"Performance ranking failed: {e}")
        return []

async def generate_auto_reply_suggestions(complaints: List[Dict]) -> List[Dict]:
    """Generate auto-reply suggestions using GEC templates"""
    try:
        auto_replies = []
        
        # GEC template mappings for ARS
        gec_templates = {
            'RIB_INVALIDE': {
                'template_id': 'GEC_RIB_001',
                'subject': 'Correction RIB nécessaire',
                'body_template': 'Bonjour, nous avons détecté une erreur dans votre RIB. Merci de nous transmettre un RIB correct dans les {delai_correction} jours. Contact: {contact_support}',
                'placeholders': ['delai_correction', 'contact_support']
            },
            'RETARD_VIREMENT': {
                'template_id': 'GEC_RETARD_001',
                'subject': 'Information délai virement',
                'body_template': 'Bonjour, votre virement sera traité dans un délai de {delai_traitement}. En cas d\'urgence, contactez {contact_urgence}. Référence: {reference_dossier}',
                'placeholders': ['delai_traitement', 'contact_urgence', 'reference_dossier']
            },
            'ERREUR_DOSSIER': {
                'template_id': 'GEC_ERREUR_001',
                'subject': 'Correction dossier en cours',
                'body_template': 'Bonjour, nous procédons à la correction de votre dossier. Délai estimé: {delai_correction}. Suivi: {numero_suivi}',
                'placeholders': ['delai_correction', 'numero_suivi']
            }
        }
        
        for complaint in complaints:
            complaint_type = complaint.get('type', classify_by_content(complaint.get('description', '')))
            
            if complaint_type in gec_templates:
                template = gec_templates[complaint_type]
                
                # Generate placeholder values
                placeholders = {}
                for placeholder in template['placeholders']:
                    if placeholder == 'delai_correction':
                        placeholders[placeholder] = '48h'
                    elif placeholder == 'delai_traitement':
                        placeholders[placeholder] = '24-48h'
                    elif placeholder == 'contact_support':
                        placeholders[placeholder] = 'support@ars.tn'
                    elif placeholder == 'contact_urgence':
                        placeholders[placeholder] = '+216 XX XXX XXX'
                    elif placeholder == 'reference_dossier':
                        placeholders[placeholder] = f"REF-{complaint.get('id', '000')}"
                    elif placeholder == 'numero_suivi':
                        placeholders[placeholder] = f"SUIVI-{complaint.get('id', '000')}"
                
                # Calculate confidence based on complaint classification accuracy
                confidence = 0.85 if complaint.get('type') else 0.70
                
                auto_replies.append({
                    'complaint_id': complaint.get('id'),
                    'template_id': template['template_id'],
                    'subject': template['subject'],
                    'body_template': template['body_template'],
                    'placeholders': placeholders,
                    'confidence': confidence,
                    'requires_human_approval': True,
                    'estimated_resolution_impact': 'Réduction délai réponse de 2-4h'
                })
        
        return auto_replies
        
    except Exception as e:
        logger.error(f"Auto-reply generation failed: {e}")
        return []

async def classify_ars_complaint(text: str, complaint_context: Dict, metadata: Dict) -> Dict:
    """Enhanced ARS complaint classification with real business context"""
    try:
        text_lower = text.lower()
        
        # Enhanced ARS-specific classification
        category = 'GENERAL'
        subcategory = 'À classifier'
        confidence = 0.7
        
        # Use context if available
        if complaint_context:
            existing_type = complaint_context.get('type')
            if existing_type:
                category = existing_type
                confidence = 0.9
        
        # Content-based classification with ARS business rules
        if any(word in text_lower for word in ['rib', 'virement', 'paiement', 'remboursement', 'compte']):
            category = 'RIB_INVALIDE'
            subcategory = 'Problème RIB/Virement'
            confidence = 0.85
        elif any(word in text_lower for word in ['retard', 'délai', 'attente', 'lent', 'urgent']):
            category = 'RETARD_VIREMENT'
            subcategory = 'Délai dépassé'
            confidence = 0.80
        elif any(word in text_lower for word in ['erreur', 'incorrect', 'faux', 'mauvais', 'mistake']):
            category = 'ERREUR_DOSSIER'
            subcategory = 'Données incorrectes'
            confidence = 0.75
        elif any(word in text_lower for word in ['service', 'accueil', 'personnel', 'comportement']):
            category = 'QUALITE_SERVICE'
            subcategory = 'Service client'
            confidence = 0.70
        elif any(word in text_lower for word in ['site', 'application', 'technique', 'bug', 'connexion']):
            category = 'PROBLEME_TECHNIQUE'
            subcategory = 'Problème technique'
            confidence = 0.75
        
        # Priority determination with ARS business rules
        priority = 'medium'
        urgency_score = 5
        
        if any(word in text_lower for word in ['urgent', 'immédiat', 'critique', 'grave', 'bloqué']):
            priority = 'urgent'
            urgency_score = 9
        elif any(word in text_lower for word in ['important', 'rapidement', 'vite', 'priorité']):
            priority = 'high'
            urgency_score = 7
        elif any(word in text_lower for word in ['quand possible', 'pas pressé', 'normal']):
            priority = 'low'
            urgency_score = 3
        
        # Enhanced sentiment analysis
        sentiment_score = calculate_ars_sentiment(text_lower)
        
        # Estimated resolution time based on ARS SLA
        resolution_time_hours = {
            'urgent': 4,
            'high': 24,
            'medium': 48,
            'low': 72
        }.get(priority, 48)
        
        # ARS-specific required skills
        skills = ['Gestion réclamations ARS']
        if category == 'RIB_INVALIDE':
            skills.extend(['Comptabilité', 'Vérification RIB'])
        elif category == 'RETARD_VIREMENT':
            skills.extend(['Suivi virements', 'Relation client'])
        elif category == 'PROBLEME_TECHNIQUE':
            skills.extend(['Support technique', 'Systèmes ARS'])
        elif category == 'QUALITE_SERVICE':
            skills.extend(['Relation client', 'Communication'])
        
        # ARS-specific suggested actions
        actions = ['Analyser la réclamation', 'Vérifier le dossier client']
        if priority == 'urgent':
            actions.insert(0, 'Traitement prioritaire immédiat')
        if category == 'RIB_INVALIDE':
            actions.append('Demander nouveau RIB au client')
        elif category == 'RETARD_VIREMENT':
            actions.append('Vérifier statut virement en comptabilité')
        elif category == 'PROBLEME_TECHNIQUE':
            actions.append('Escalader vers équipe technique')
        
        return {
            'category': category,
            'subcategory': subcategory,
            'priority': priority,
            'confidence': confidence,
            'estimatedResolutionTimeHours': resolution_time_hours,
            'requiredSkills': skills,
            'suggestedActions': actions,
            'sentiment': sentiment_score['sentiment'],
            'sentimentScore': sentiment_score['score'],
            'urgencyScore': urgency_score,
            'keywords': extract_ars_keywords(text_lower),
            'businessContext': {
                'slaCategory': map_to_sla_category(category),
                'escalationRequired': priority in ['urgent', 'high'] and category in ['RIB_INVALIDE', 'RETARD_VIREMENT'],
                'automatedResponsePossible': category in ['RIB_INVALIDE', 'RETARD_VIREMENT', 'PROBLEME_TECHNIQUE']
            }
        }
        
    except Exception as e:
        logger.error(f"ARS complaint classification failed: {e}")
        return {'error': str(e)}

async def generate_ars_auto_reply(classification_result: Dict, complaint_context: Dict) -> Dict:
    """Generate ARS-specific auto-reply using GEC templates"""
    try:
        category = classification_result.get('category', 'GENERAL')
        priority = classification_result.get('priority', 'medium')
        
        # ARS GEC template selection
        template_mapping = {
            'RIB_INVALIDE': 'GEC_RIB_CORRECTION',
            'RETARD_VIREMENT': 'GEC_DELAI_VIREMENT',
            'ERREUR_DOSSIER': 'GEC_CORRECTION_DOSSIER',
            'PROBLEME_TECHNIQUE': 'GEC_SUPPORT_TECHNIQUE',
            'QUALITE_SERVICE': 'GEC_SERVICE_CLIENT'
        }
        
        template_id = template_mapping.get(category, 'GEC_GENERAL')
        
        # Generate contextual placeholders
        placeholders = {}
        if complaint_context:
            placeholders['client_name'] = complaint_context.get('client_name', 'Client')
            placeholders['reference_dossier'] = complaint_context.get('reference', f"REF-{complaint_context.get('id', '000')}")
        else:
            placeholders['client_name'] = 'Client'
            placeholders['reference_dossier'] = 'REF-000'
        
        # Priority-based response timing
        if priority == 'urgent':
            placeholders['delai_reponse'] = '2-4 heures'
            placeholders['contact_urgence'] = '+216 XX XXX XXX'
        elif priority == 'high':
            placeholders['delai_reponse'] = '24 heures'
        else:
            placeholders['delai_reponse'] = '48 heures'
        
        # Category-specific placeholders
        if category == 'RIB_INVALIDE':
            placeholders['delai_correction'] = '48 heures'
            placeholders['documents_requis'] = 'RIB original + pièce d\'identité'
        elif category == 'RETARD_VIREMENT':
            placeholders['delai_virement'] = '24-48 heures ouvrables'
            placeholders['suivi_reference'] = f"SUIVI-{complaint_context.get('id', '000') if complaint_context else '000'}"
        
        confidence = 0.85 if category in template_mapping else 0.60
        
        return {
            'template_id': template_id,
            'confidence': confidence,
            'placeholders': placeholders,
            'requires_approval': priority == 'urgent' or confidence < 0.75,
            'estimated_response_time_minutes': 5 if category in template_mapping else 15,
            'business_impact': {
                'response_time_reduction': '2-4 hours',
                'customer_satisfaction_impact': 'positive',
                'agent_time_saved': '10-15 minutes'
            }
        }
        
    except Exception as e:
        logger.error(f"ARS auto-reply generation failed: {e}")
        return {'error': str(e)}

def generate_processing_recommendations(classification_result: Dict) -> List[str]:
    """Generate ARS-specific processing recommendations"""
    recommendations = []
    
    category = classification_result.get('category', 'GENERAL')
    priority = classification_result.get('priority', 'medium')
    
    # Priority-based recommendations
    if priority == 'urgent':
        recommendations.append('Traitement immédiat requis - SLA 4h')
        recommendations.append('Notification automatique au chef d\'équipe')
    
    # Category-specific recommendations
    if category == 'RIB_INVALIDE':
        recommendations.extend([
            'Vérifier RIB dans système comptable',
            'Demander nouveau RIB si nécessaire',
            'Bloquer virement en cours si applicable'
        ])
    elif category == 'RETARD_VIREMENT':
        recommendations.extend([
            'Vérifier statut virement en comptabilité',
            'Contrôler délais SLA client',
            'Préparer justificatif si retard confirmé'
        ])
    elif category == 'ERREUR_DOSSIER':
        recommendations.extend([
            'Audit complet du dossier client',
            'Identifier source de l\'erreur',
            'Corriger et documenter les modifications'
        ])
    elif category == 'PROBLEME_TECHNIQUE':
        recommendations.extend([
            'Escalade vers équipe technique',
            'Test de reproduction du problème',
            'Solution de contournement si disponible'
        ])
    
    return recommendations

def filter_complaints_by_period(complaints: List[Dict], period_days: int) -> List[Dict]:
    """Filter complaints by time period"""
    cutoff_date = datetime.now() - timedelta(days=period_days)
    
    filtered = []
    for complaint in complaints:
        created_at = complaint.get('created_at', datetime.now())
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00').replace('+00:00', ''))
            except:
                created_at = datetime.now()
        
        if created_at >= cutoff_date:
            filtered.append(complaint)
    
    return filtered

def calculate_simple_p_value(occurrences: int, total: int) -> float:
    """Calculate simplified p-value for correlation significance"""
    if total == 0:
        return 1.0
    
    proportion = occurrences / total
    
    # Simplified p-value calculation
    if proportion > 0.5:
        return 0.01  # Highly significant
    elif proportion > 0.3:
        return 0.05  # Significant
    elif proportion > 0.2:
        return 0.1   # Marginally significant
    else:
        return 0.2   # Not significant

def calculate_ars_sentiment(text_lower: str) -> Dict:
    """Calculate sentiment with ARS-specific context"""
    positive_words = ['merci', 'satisfait', 'content', 'bien', 'bon', 'parfait', 'excellent']
    negative_words = ['problème', 'mécontent', 'déçu', 'mauvais', 'insatisfait', 'erreur', 'retard']
    
    pos_count = sum(1 for word in positive_words if word in text_lower)
    neg_count = sum(1 for word in negative_words if word in text_lower)
    
    score = pos_count - neg_count
    
    if score > 0:
        sentiment = 'positive'
    elif score < 0:
        sentiment = 'negative'
    else:
        sentiment = 'neutral'
    
    return {'sentiment': sentiment, 'score': score}

def extract_ars_keywords(text_lower: str) -> List[str]:
    """Extract ARS-specific keywords"""
    ars_keywords = ['rib', 'virement', 'remboursement', 'délai', 'retard', 'erreur', 'dossier', 'client', 'service']
    
    found_keywords = [word for word in ars_keywords if word in text_lower]
    
    # Add general keywords
    words = text_lower.split()
    important_words = [word for word in words if len(word) > 4 and word not in ['dans', 'avec', 'pour', 'cette', 'votre']]
    
    return list(set(found_keywords + important_words[:3]))

def map_to_sla_category(category: str) -> str:
    """Map complaint category to ARS SLA category"""
    sla_mapping = {
        'RIB_INVALIDE': 'URGENT_48H',
        'RETARD_VIREMENT': 'URGENT_24H',
        'ERREUR_DOSSIER': 'STANDARD_72H',
        'PROBLEME_TECHNIQUE': 'STANDARD_48H',
        'QUALITE_SERVICE': 'STANDARD_72H'
    }
    
    return sla_mapping.get(category, 'STANDARD_72H')

def generate_key_findings(classification_results: Dict, recurrence_analysis: Dict, anomaly_analysis: Dict) -> List[str]:
    """Generate key findings summary"""
    findings = []
    
    # Top complaint type
    if classification_results.get('top_categories'):
        top_category = max(classification_results['top_categories'], key=classification_results['top_categories'].get)
        count = classification_results['top_categories'][top_category]
        findings.append(f'Type de réclamation dominant: {top_category} ({count} occurrences)')
    
    # Recurrence patterns
    if recurrence_analysis.get('top_recurrent_types'):
        recurrent_count = len(recurrence_analysis['top_recurrent_types'])
        findings.append(f'{recurrent_count} patterns récurrents identifiés')
    
    # Anomalies
    if anomaly_analysis.get('anomalies'):
        anomaly_count = len(anomaly_analysis['anomalies'])
        findings.append(f'{anomaly_count} jours avec volume anormal de réclamations')
    
    return findings or ['Aucune tendance significative détectée']