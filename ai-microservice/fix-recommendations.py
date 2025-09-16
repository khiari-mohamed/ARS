#!/usr/bin/env python3
"""
Quick fix for the recommendations endpoint type conversion error
"""

import re

def fix_recommendations_endpoint():
    """Apply a targeted fix to the recommendations endpoint"""
    
    # Read the current file
    with open('ai_microservice.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find and replace the problematic section with a safer version
    old_pattern = r'(\s+)# 2\. Agent Performance Analysis\s+if agents:(.*?)if high_performers:'
    
    new_section = '''        # 2. Agent Performance Analysis
        if agents:
            low_performers = []
            high_performers = []
            
            for agent in agents:
                try:
                    total_bordereaux = agent.get('total_bordereaux', 0)
                    sla_compliant = agent.get('sla_compliant', 0)
                    
                    # Safe conversion to integers
                    total_bordereaux = int(float(str(total_bordereaux))) if total_bordereaux not in [None, '', 'None'] else 0
                    sla_compliant = int(float(str(sla_compliant))) if sla_compliant not in [None, '', 'None'] else 0
                    
                    if total_bordereaux > 0:
                        compliance_rate = sla_compliant / total_bordereaux
                        if compliance_rate < 0.7:  # Less than 70% SLA compliance
                            low_performers.append(agent)
                        elif compliance_rate > 0.9:  # More than 90% SLA compliance
                            high_performers.append(agent)
                except Exception as e:
                    logger.debug(f"Agent analysis error: {e}")
                    continue
            
            if low_performers:
                recommendations.append({
                    "type": "PERFORMANCE_IMPROVEMENT",
                    "priority": "MEDIUM",
                    "title": "Formation gestionnaires",
                    "description": f"{len(low_performers)} gestionnaires avec performance en dessous de 70%",
                    "action": "Programme de formation ciblé",
                    "impact": "Amélioration de la qualité de traitement",
                    "recommendation": "Organiser des sessions de formation sur les processus complexes"
                })
            
            if high_performers:'''
    
    # Apply the fix
    content = re.sub(old_pattern, new_section, content, flags=re.DOTALL)
    
    # Write back the fixed content
    with open('ai_microservice.py', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Applied targeted fix to recommendations endpoint")

if __name__ == "__main__":
    fix_recommendations_endpoint()