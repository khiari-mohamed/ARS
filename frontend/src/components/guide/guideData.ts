import React from 'react';
import {
  Business,
  Scanner,
  LocalHospital,
  Email,
  AccountBalance,
  People,
  Analytics,
  Warning,
  SmartToy
} from '@mui/icons-material';

export const moduleData: Record<string, any> = {
  BO: {
    name: 'Bureau d\'Ordre',
    icon: React.createElement(Business),
    description: 'Réception physique des dossiers et saisie initiale des données. Point d\'entrée de tous les documents dans le système.',
    features: [
      'Saisie initiale des bordereaux',
      'Génération automatique de références',
      'Classification des documents',
      'Validation qualité des fichiers',
      'Suivi physique des documents',
      'Auto-récupération des données client'
    ],
    roles: ['Bureau d\'Ordre', 'Super Admin'],
    kpis: [
      'Nombre d\'entrées par jour',
      'Temps moyen de saisie',
      'Taux d\'erreur de saisie',
      'Vitesse de traitement'
    ],
    connections: ['Scan/GED', 'Clients/Contrats']
  },
  SCAN: {
    name: 'Scan/GED',
    icon: React.createElement(Scanner),
    description: 'Numérisation des documents via OCR et archivage structuré dans le système GED avec indexation automatique.',
    features: [
      'Numérisation OCR avancée',
      'Indexation automatique GED',
      'Intégration PaperStream',
      'Recherche multicritères',
      'Archivage sécurisé',
      'Extraction de texte intelligente'
    ],
    roles: ['Équipe Scan', 'Gestionnaire GED', 'Super Admin'],
    kpis: [
      'Documents numérisés/jour',
      'Qualité OCR (%)',
      'Temps de traitement moyen',
      'Taux de réussite indexation'
    ],
    connections: ['Bureau d\'Ordre', 'Équipe Santé', 'Analytics']
  },
  SANTE: {
    name: 'Équipe Santé',
    icon: React.createElement(LocalHospital),
    description: 'Traitement des bulletins de soins par les chefs d\'équipe et gestionnaires avec suivi SLA temps réel.',
    features: [
      'Affectation intelligente des dossiers',
      'Traitement des bulletins de soins',
      'Validation expertise médicale',
      'Gestion des corbeilles par rôle',
      'Suivi SLA en temps réel',
      'Workflow automatisé'
    ],
    roles: ['Chef d\'Équipe', 'Gestionnaire', 'Responsable Santé', 'Super Admin'],
    kpis: [
      'Dossiers traités/gestionnaire',
      'Respect des délais SLA',
      'Taux de validation',
      'Performance par équipe'
    ],
    connections: ['Scan/GED', 'Finance/OV', 'GEC/Courriers', 'Clients/Contrats']
  },
  GEC: {
    name: 'GEC/Courriers',
    icon: React.createElement(Email),
    description: 'Gestion électronique des courriers et traitement intelligent des réclamations avec IA de classification.',
    features: [
      'Génération automatique de courriers',
      'Templates personnalisables',
      'Intégration Outlook MS365',
      'Classification IA des réclamations',
      'Réponses automatiques suggérées',
      'Suivi des correspondances'
    ],
    roles: ['Service Client', 'Gestionnaire', 'Chef d\'Équipe', 'Super Admin'],
    kpis: [
      'Courriers envoyés/jour',
      'Temps de réponse moyen',
      'Taux de résolution réclamations',
      'Satisfaction client'
    ],
    connections: ['Équipe Santé', 'Clients/Contrats', 'IA/Workflow']
  },
  FINANCE: {
    name: 'Finance/OV',
    icon: React.createElement(AccountBalance),
    description: 'Gestion des ordres de virement multi-banques avec génération automatique des fichiers PDF/TXT bancaires.',
    features: [
      'Génération ordres de virement',
      'Support multi-banques',
      'Export PDF/TXT automatique',
      'Suivi statuts virements',
      'Réconciliation bancaire',
      'Alertes retards paiement'
    ],
    roles: ['Service Financier', 'Responsable Finance', 'Super Admin'],
    kpis: [
      'Montants virés/jour',
      'Délais de traitement',
      'Taux de confirmation',
      'Erreurs de virement'
    ],
    connections: ['Équipe Santé', 'Analytics/KPI']
  },
  CLIENTS: {
    name: 'Clients/Contrats',
    icon: React.createElement(People),
    description: 'Gestion des profils clients et contrats avec paramètres SLA et affectation automatique des gestionnaires.',
    features: [
      'Profils compagnies d\'assurance',
      'Gestion des contrats actifs',
      'Paramètres SLA personnalisés',
      'Affectation gestionnaires',
      'Historique des relations',
      'Seuils d\'alerte configurables'
    ],
    roles: ['Gestionnaire Client', 'Chef d\'Équipe', 'Super Admin'],
    kpis: [
      'Nombre de clients actifs',
      'Contrats en cours',
      'Respect SLA par client',
      'Volume d\'affaires'
    ],
    connections: ['Bureau d\'Ordre', 'Équipe Santé', 'GEC/Courriers']
  },
  ANALYTICS: {
    name: 'Analytics/KPI',
    icon: React.createElement(Analytics),
    description: 'Tableaux de bord temps réel avec analytics avancés et prédictions IA pour l\'optimisation des performances.',
    features: [
      'Dashboards temps réel',
      'KPIs multi-niveaux',
      'Analytics prédictifs',
      'Export Excel/PDF',
      'Filtrage avancé',
      'Rapports programmés'
    ],
    roles: ['Tous les rôles', 'Responsables', 'Super Admin'],
    kpis: [
      'Performance globale',
      'Tendances temporelles',
      'Comparaisons périodiques',
      'Prédictions de charge'
    ],
    connections: ['Tous les modules', 'IA/Workflow']
  },
  ALERTS: {
    name: 'Alertes/SLA',
    icon: React.createElement(Warning),
    description: 'Système d\'alertes temps réel avec escalade automatique et notifications multi-canaux pour le respect des SLA.',
    features: [
      'Alertes SLA temps réel',
      'Escalade automatique',
      'Notifications multi-canaux',
      'Règles personnalisables',
      'Historique des alertes',
      'Intégration Socket.io'
    ],
    roles: ['Tous les rôles', 'Responsables', 'Super Admin'],
    kpis: [
      'Alertes déclenchées/jour',
      'Temps de résolution',
      'Taux d\'escalade',
      'Efficacité des notifications'
    ],
    connections: ['Tous les modules', 'IA/Workflow']
  },
  AI: {
    name: 'IA/Workflow',
    icon: React.createElement(SmartToy),
    description: 'Intelligence artificielle pour l\'affectation optimale, la prédiction des retards et l\'automatisation des processus.',
    features: [
      'Affectation intelligente',
      'Prédiction des retards SLA',
      'Classification automatique',
      'Détection d\'anomalies',
      'Optimisation des ressources',
      'Apprentissage continu'
    ],
    roles: ['Système automatique', 'Super Admin'],
    kpis: [
      'Précision des prédictions',
      'Gain de productivité',
      'Réduction des retards',
      'Optimisation des affectations'
    ],
    connections: ['Analytics/KPI', 'Alertes/SLA', 'Tous les modules']
  }
};

export const roleData: Record<string, any> = {
  ALL: {
    name: 'Vue Complète',
    icon: '👑',
    color: '#1976d2',
    description: 'Accès à tous les modules et fonctionnalités'
  },
  BUREAU_ORDRE: {
    name: 'Bureau d\'Ordre',
    icon: '📥',
    color: '#ff9800',
    description: 'Saisie initiale et réception des dossiers'
  },
  SCAN: {
    name: 'Équipe Scan',
    icon: '🖨️',
    color: '#2196f3',
    description: 'Numérisation et archivage GED'
  },
  CHEF_EQUIPE: {
    name: 'Chef d\'Équipe',
    icon: '👨⚕️',
    color: '#4caf50',
    description: 'Gestion d\'équipe et affectation des dossiers'
  },
  GESTIONNAIRE: {
    name: 'Gestionnaire',
    icon: '👩💼',
    color: '#9c27b0',
    description: 'Traitement des dossiers et bulletins de soins'
  },
  FINANCE: {
    name: 'Finance',
    icon: '💰',
    color: '#f44336',
    description: 'Gestion des virements et paiements'
  },
  CLIENT_SERVICE: {
    name: 'Service Client',
    icon: '👥',
    color: '#795548',
    description: 'Gestion des réclamations et relation client'
  }
};