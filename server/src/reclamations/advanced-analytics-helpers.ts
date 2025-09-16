// Helper methods for advanced analytics service
export class AdvancedAnalyticsHelpers {
  static extractPatternName(texts: string[]): string {
    if (texts.length === 0) return 'Pattern inconnu';
    
    // Find common words across texts
    const wordCounts = new Map<string, number>();
    const stopWords = ['le', 'la', 'les', 'de', 'du', 'des', 'et', 'ou', 'un', 'une', 'ce', 'cette', 'pour', 'avec', 'dans', 'sur', 'par'];
    
    texts.forEach(text => {
      const words = text.toLowerCase().split(/\s+/).filter(word => 
        word.length > 3 && !stopWords.includes(word)
      );
      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });
    
    const commonWords = Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= Math.ceil(texts.length * 0.5))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
    
    return commonWords.length > 0 ? commonWords.join(' + ') : 'Pattern détecté';
  }

  static extractCategories(claims: any[]): string[] {
    const categories = new Set<string>();
    claims.forEach(claim => {
      if (claim.type) categories.add(claim.type);
    });
    return Array.from(categories);
  }

  static extractRootCauseKey(text: string): string {
    const keywords = ['délai', 'retard', 'erreur', 'problème', 'paiement', 'remboursement', 'service', 'technique'];
    const lowerText = text.toLowerCase();
    
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return keyword;
      }
    }
    
    // Fallback to first significant word
    const words = text.split(/\s+/).filter(w => w.length > 4);
    return words[0] || 'unknown';
  }

  static generateRootCauseDescription(key: string, claims: any[]): string {
    const descriptions = {
      'délai': 'Problèmes récurrents de délais de traitement',
      'retard': 'Retards systémiques dans le processus',
      'erreur': 'Erreurs répétées dans le traitement',
      'problème': 'Problématiques techniques récurrentes',
      'paiement': 'Dysfonctionnements dans les paiements',
      'remboursement': 'Difficultés de remboursement',
      'service': 'Problèmes de qualité de service',
      'technique': 'Défaillances techniques répétées'
    };
    
    return descriptions[key] || `Cause racine identifiée: ${key}`;
  }

  static getMostCommonCategory(claims: any[]): string {
    const categoryCounts = new Map<string, number>();
    claims.forEach(claim => {
      const category = claim.type || 'AUTRE';
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });
    
    let maxCount = 0;
    let mostCommon = 'AUTRE';
    categoryCounts.forEach((count, category) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = category;
      }
    });
    
    return mostCommon;
  }

  static generatePreventionActions(key: string, claims: any[]): string[] {
    const actionMap = {
      'délai': [
        'Optimiser les processus de traitement',
        'Augmenter les ressources dédiées',
        'Mettre en place des alertes précoces'
      ],
      'erreur': [
        'Renforcer les contrôles qualité',
        'Former les équipes sur les bonnes pratiques',
        'Automatiser les processus critiques'
      ],
      'paiement': [
        'Réviser les procédures de paiement',
        'Améliorer l\'intégration bancaire',
        'Mettre en place des vérifications automatiques'
      ],
      'service': [
        'Former les équipes service client',
        'Améliorer les outils de communication',
        'Mettre en place des indicateurs de satisfaction'
      ]
    };
    
    return actionMap[key] || [
      'Analyser en détail cette cause racine',
      'Mettre en place des mesures correctives',
      'Surveiller l\'évolution des indicateurs'
    ];
  }

  static calculateDailyVolumes(claims: any[]): number[] {
    const dailyVolumes = new Map<string, number>();
    
    claims.forEach(claim => {
      const date = new Date(claim.createdAt).toISOString().split('T')[0];
      dailyVolumes.set(date, (dailyVolumes.get(date) || 0) + 1);
    });
    
    const sortedDates = Array.from(dailyVolumes.keys()).sort();
    return sortedDates.map(date => dailyVolumes.get(date) || 0);
  }
}