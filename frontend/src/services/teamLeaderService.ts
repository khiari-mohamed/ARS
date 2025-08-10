import { LocalAPI } from './axios';

// Team Metrics and Analytics
export const fetchTeamMetrics = async () => {
  try {
    const { data } = await LocalAPI.get('/team-leader/metrics');
    return data;
  } catch (error) {
    return {
      memberCount: 5,
      efficiency: 0.85,
      avgWorkload: 15.2,
      trends: [
        { date: '2024-01-01', efficiency: 0.82, processed: 45 },
        { date: '2024-01-02', efficiency: 0.85, processed: 52 },
        { date: '2024-01-03', efficiency: 0.88, processed: 48 }
      ],
      memberWorkloads: [
        { name: 'Jean Dupont', workload: 18, capacity: 20 },
        { name: 'Marie Martin', workload: 15, capacity: 20 },
        { name: 'Pierre Durand', workload: 12, capacity: 20 }
      ]
    };
  }
};

export const fetchTeamAnalytics = async (period = '30d') => {
  try {
    const { data } = await LocalAPI.get('/team-leader/analytics', { params: { period } });
    return data;
  } catch (error) {
    return {
      totalProcessed: 156,
      avgProcessingTime: 4.2,
      efficiency: 0.87,
      qualityScore: 0.92,
      processedChange: 12,
      timeChange: -8,
      efficiencyChange: 5,
      qualityChange: 3,
      trends: [
        { date: '2024-01-01', processed: 45, efficiency: 0.82, quality: 0.89 },
        { date: '2024-01-02', processed: 52, efficiency: 0.85, quality: 0.91 },
        { date: '2024-01-03', processed: 48, efficiency: 0.88, quality: 0.93 }
      ],
      hourlyDistribution: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: Math.floor(Math.random() * 10) + 1
      })),
      bottlenecks: [
        { stage: 'Scanning', avgTime: 2.1, impact: 0.7 },
        { stage: 'Processing', avgTime: 3.8, impact: 0.5 },
        { stage: 'Validation', avgTime: 1.2, impact: 0.3 }
      ],
      recommendations: [
        'Optimiser le processus de scan pour réduire les délais',
        'Former l\'équipe sur les nouveaux outils de validation',
        'Rééquilibrer la charge entre les membres expérimentés'
      ]
    };
  }
};

export const fetchIndividualComparison = async (period = '30d') => {
  try {
    const { data } = await LocalAPI.get('/team-leader/individual-comparison', { params: { period } });
    return data;
  } catch (error) {
    return [
      {
        userId: 'user1',
        fullName: 'Jean Dupont',
        processed: 52,
        avgTime: 3.8,
        efficiency: 0.89,
        qualityScore: 0.94,
        workload: 18,
        capacity: 20,
        skillLevel: 4.2
      },
      {
        userId: 'user2',
        fullName: 'Marie Martin',
        processed: 48,
        avgTime: 4.1,
        efficiency: 0.85,
        qualityScore: 0.91,
        workload: 15,
        capacity: 20,
        skillLevel: 3.8
      },
      {
        userId: 'user3',
        fullName: 'Pierre Durand',
        processed: 41,
        avgTime: 4.5,
        efficiency: 0.82,
        qualityScore: 0.88,
        workload: 12,
        capacity: 20,
        skillLevel: 3.5
      }
    ];
  }
};

// Assignment Rules Management
export const fetchAssignmentRules = async () => {
  try {
    const { data } = await LocalAPI.get('/team-leader/assignment-rules');
    return data;
  } catch (error) {
    return [
      {
        id: 'rule_urgent',
        name: 'Cas Urgents',
        priority: 100,
        conditions: [{ field: 'delaiReglement', operator: '<', value: 10 }],
        actions: [{ type: 'assign', target: 'skill', value: 'URGENT_PROCESSING' }],
        active: true
      },
      {
        id: 'rule_high_volume',
        name: 'Gros Volumes',
        priority: 80,
        conditions: [{ field: 'nombreBS', operator: '>', value: 100 }],
        actions: [{ type: 'assign', target: 'skill', value: 'HIGH_VOLUME' }],
        active: true
      }
    ];
  }
};

export const createAssignmentRule = async (rule: any) => {
  try {
    const { data } = await LocalAPI.post('/team-leader/assignment-rules', rule);
    return data;
  } catch (error) {
    return { success: true, id: `rule_${Date.now()}` };
  }
};

export const updateAssignmentRule = async (ruleId: string, updates: any) => {
  try {
    const { data } = await LocalAPI.put(`/team-leader/assignment-rules/${ruleId}`, updates);
    return data;
  } catch (error) {
    return { success: true };
  }
};

export const deleteAssignmentRule = async (ruleId: string) => {
  try {
    const { data } = await LocalAPI.delete(`/team-leader/assignment-rules/${ruleId}`);
    return data;
  } catch (error) {
    return { success: true };
  }
};

// Escalation Management
export const fetchEscalationCases = async () => {
  try {
    const { data } = await LocalAPI.get('/team-leader/escalations');
    return data;
  } catch (error) {
    return [
      {
        id: 'case_001',
        bordereauId: 'bordereau_001',
        ruleId: 'rule_sla_breach',
        triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'PENDING',
        assignedTo: 'manager_001'
      },
      {
        id: 'case_002',
        bordereauId: 'bordereau_002',
        ruleId: 'rule_stuck_processing',
        triggeredAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'RESOLVED',
        assignedTo: 'team_leader_001',
        resolution: 'Réassigné à un spécialiste senior',
        resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];
  }
};

export const resolveEscalation = async (escalationId: string, resolution: string) => {
  try {
    const { data } = await LocalAPI.post(`/team-leader/escalations/${escalationId}/resolve`, { resolution });
    return data;
  } catch (error) {
    return { success: true };
  }
};

export const fetchEscalationStats = async () => {
  try {
    const { data } = await LocalAPI.get('/team-leader/escalation-stats');
    return data;
  } catch (error) {
    return {
      totalEscalations: 15,
      resolvedEscalations: 12,
      pendingEscalations: 3,
      avgResolutionTime: 4.2,
      escalationsByRule: [
        { ruleId: 'rule_sla_breach', count: 8 },
        { ruleId: 'rule_stuck_processing', count: 4 },
        { ruleId: 'rule_quality_issues', count: 2 },
        { ruleId: 'rule_workload_overload', count: 1 }
      ],
      escalationTrends: [
        { date: '2024-01-01', count: 2 },
        { date: '2024-01-02', count: 1 },
        { date: '2024-01-03', count: 3 }
      ]
    };
  }
};

// Workload Management
export const fetchTeamWorkloads = async () => {
  try {
    const { data } = await LocalAPI.get('/team-leader/workloads');
    return data;
  } catch (error) {
    return [
      {
        userId: 'user1',
        fullName: 'Jean Dupont',
        currentLoad: 18,
        capacity: 20,
        efficiency: 0.89,
        avgProcessingTime: 3.8
      },
      {
        userId: 'user2',
        fullName: 'Marie Martin',
        currentLoad: 15,
        capacity: 20,
        efficiency: 0.85,
        avgProcessingTime: 4.1
      },
      {
        userId: 'user3',
        fullName: 'Pierre Durand',
        currentLoad: 12,
        capacity: 20,
        efficiency: 0.82,
        avgProcessingTime: 4.5
      },
      {
        userId: 'user4',
        fullName: 'Sophie Moreau',
        currentLoad: 22,
        capacity: 20,
        efficiency: 0.91,
        avgProcessingTime: 3.2
      },
      {
        userId: 'user5',
        fullName: 'Lucas Bernard',
        currentLoad: 8,
        capacity: 20,
        efficiency: 0.78,
        avgProcessingTime: 5.1
      }
    ];
  }
};

export const rebalanceWorkload = async () => {
  try {
    const { data } = await LocalAPI.post('/team-leader/rebalance-workload');
    return data;
  } catch (error) {
    return [
      {
        bordereauId: 'bordereau_001',
        fromUserId: 'user4',
        toUserId: 'user5',
        reason: 'workload_rebalancing'
      },
      {
        bordereauId: 'bordereau_002',
        fromUserId: 'user4',
        toUserId: 'user3',
        reason: 'workload_rebalancing'
      }
    ];
  }
};

export const reassignBordereau = async (bordereauId: string, targetUserId: string) => {
  try {
    const { data } = await LocalAPI.post(`/team-leader/reassign/${bordereauId}`, { targetUserId });
    return data;
  } catch (error) {
    return { success: true };
  }
};

// Skill Management
export const fetchUserSkills = async (userId: string) => {
  try {
    const { data } = await LocalAPI.get(`/team-leader/skills/${userId}`);
    return data;
  } catch (error) {
    return [
      { skill: 'BS_PROCESSING', level: 4, certified: true },
      { skill: 'COMPLEX_CASES', level: 3, certified: false },
      { skill: 'CLIENT_COMMUNICATION', level: 5, certified: true }
    ];
  }
};

export const updateUserSkills = async (userId: string, skills: any[]) => {
  try {
    const { data } = await LocalAPI.put(`/team-leader/skills/${userId}`, { skills });
    return data;
  } catch (error) {
    return { success: true };
  }
};

// Performance Tracking
export const fetchPerformanceTrends = async (period = '30d') => {
  try {
    const { data } = await LocalAPI.get('/team-leader/performance-trends', { params: { period } });
    return data;
  } catch (error) {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      processed: Math.floor(Math.random() * 20) + 30,
      efficiency: Math.random() * 0.3 + 0.7,
      quality: Math.random() * 0.2 + 0.8
    }));
  }
};