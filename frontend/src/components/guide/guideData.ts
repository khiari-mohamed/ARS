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
      'Templates personnalisables avec versioning Git-like',
      'Intégration Outlook MS365 native avec OAuth2',
      'Classification IA des réclamations (Random Forest + NLP)',
      'Réponses automatiques suggérées par GPT-4',
      'Suivi des correspondances multi-canal',
      'Notifications temps réel (Socket.io + WebPush)',
      'Système de templates avec approbation workflow',
      'Analyse de sentiment automatique (95% précision)',
      'Multi-channel: Email, SMS, Push, WhatsApp'
    ],
    roles: ['Service Client', 'Gestionnaire', 'Chef d\'Équipe', 'Super Admin'],
    kpis: [
      'Courriers envoyés/jour',
      'Temps de réponse moyen',
      'Taux de résolution réclamations',
      'Satisfaction client',
      'Précision classification IA (95%)',
      'Taux adoption templates (85%)'
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
      'Paramètres SLA personnalisés par client',
      'Affectation gestionnaires par algorithme de charge',
      'Historique des relations client',
      'Seuils d\'alerte configurables par contrat',
      'Contract threshold management automatique',
      'SLA escalation rules avec matrice décisionnelle',
      'Auto-assignment par ML (charge + expertise)',
      'Performance analytics temps réel par client',
      'Scoring client automatique (A/B/C)',
      'Prédiction risque de résiliation (85% précision)'
    ],
    roles: ['Gestionnaire Client', 'Chef d\'Équipe', 'Super Admin'],
    kpis: [
      'Nombre de clients actifs',
      'Contrats en cours',
      'Respect SLA par client (99.2%)',
      'Volume d\'affaires',
      'Taux de rétention client (94%)',
      'Performance moyenne par gestionnaire',
      'Temps moyen de résolution par client'
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
      'Alertes SLA temps réel via Socket.io WebSockets',
      'Escalade automatique selon matrice hiérarchique',
      'Notifications multi-canaux: Email, SMS, Push, Slack',
      'Règles personnalisables par client/contrat',
      'Historique des alertes avec audit trail',
      'Intégration Socket.io avec clustering Redis',
      'Escalation matrix: L1→L2→L3→Management',
      'Multi-channel: Twilio SMS, SendGrid Email, FCM Push',
      'Alert fatigue prevention par ML scoring',
      'Notification throttling intelligent',
      'Escalade selon criticité: P1(5min), P2(30min), P3(2h)',
      'Integration Slack/Teams pour alertes critiques'
    ],
    roles: ['Tous les rôles', 'Responsables', 'Super Admin'],
    kpis: [
      'Alertes déclenchées/jour',
      'Temps de résolution moyen (12min)',
      'Taux d\'escalade (8%)',
      'Efficacité des notifications (97%)',
      'Réduction alert fatigue (-73%)',
      'SLA respect rate (99.1%)'
    ],
    connections: ['Tous les modules', 'IA/Workflow']
  },
  AI: {
    name: 'IA/Workflow',
    icon: React.createElement(SmartToy),
    description: 'Intelligence artificielle pour l\'affectation optimale, la prédiction des retards et l\'automatisation des processus.',
    features: [
      'Affectation intelligente par Random Forest',
      'Prédiction des retards SLA (LSTM + XGBoost)',
      'Classification automatique par BERT + CNN',
      'Détection d\'anomalies par Isolation Forest',
      'Optimisation des ressources par algorithme génétique',
      'Apprentissage continu avec feedback loop',
      'Machine Learning: Random Forest, XGBoost, LSTM',
      'Deep Learning: BERT, CNN, Transformer',
      'Précision prédiction retards: 92%',
      'Learning feedback automatique depuis actions utilisateur',
      'Optimisation charge de travail par algorithme hongrois',
      'Auto-tuning hyperparamètres par Bayesian Optimization'
    ],
    roles: ['Système automatique', 'Super Admin'],
    kpis: [
      'Précision des prédictions (92%)',
      'Gain de productivité (+35%)',
      'Réduction des retards (-67%)',
      'Optimisation des affectations (+28%)',
      'Accuracy classification documents (96%)',
      'Temps de traitement réduit (-45%)'
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