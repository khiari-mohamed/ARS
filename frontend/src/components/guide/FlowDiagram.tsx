import React from 'react';
import { Box, Paper, Typography, Chip } from '@mui/material';
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

interface FlowDiagramProps {
  selectedRole: string;
  selectedModule: string | null;
  onModuleClick: (moduleId: string) => void;
  showGuidedTour: boolean;
}

const FlowDiagram: React.FC<FlowDiagramProps> = ({
  selectedRole,
  selectedModule,
  onModuleClick,
  showGuidedTour
}) => {
  const modules = [
    { id: 'BO', name: 'Bureau d\'Ordre', icon: <Business />, x: 50, y: 50, color: '#ff9800' },
    { id: 'SCAN', name: 'Scan/GED', icon: <Scanner />, x: 250, y: 50, color: '#2196f3' },
    { id: 'SANTE', name: 'Équipe Santé', icon: <LocalHospital />, x: 450, y: 50, color: '#4caf50' },
    { id: 'GEC', name: 'GEC/Courriers', icon: <Email />, x: 150, y: 200, color: '#9c27b0' },
    { id: 'FINANCE', name: 'Finance/OV', icon: <AccountBalance />, x: 650, y: 50, color: '#f44336' },
    { id: 'CLIENTS', name: 'Clients/Contrats', icon: <People />, x: 350, y: 200, color: '#795548' },
    { id: 'ANALYTICS', name: 'Analytics/KPI', icon: <Analytics />, x: 550, y: 200, color: '#607d8b' },
    { id: 'ALERTS', name: 'Alertes/SLA', icon: <Warning />, x: 50, y: 350, color: '#ff5722' },
    { id: 'AI', name: 'IA/Workflow', icon: <SmartToy />, x: 450, y: 350, color: '#3f51b5' }
  ];

  const connections = [
    { from: 'BO', to: 'SCAN' },
    { from: 'SCAN', to: 'SANTE' },
    { from: 'SANTE', to: 'FINANCE' },
    { from: 'GEC', to: 'SANTE' },
    { from: 'CLIENTS', to: 'SANTE' },
    { from: 'ANALYTICS', to: 'AI' },
    { from: 'ALERTS', to: 'AI' }
  ];

  const isModuleVisible = (moduleId: string) => {
    if (selectedRole === 'ALL') return true;
    
    const roleModules: Record<string, string[]> = {
      'BUREAU_ORDRE': ['BO', 'CLIENTS'],
      'SCAN': ['SCAN', 'BO'],
      'CHEF_EQUIPE': ['SANTE', 'ANALYTICS', 'ALERTS'],
      'GESTIONNAIRE': ['SANTE', 'GEC', 'CLIENTS'],
      'FINANCE': ['FINANCE', 'ANALYTICS'],
      'CLIENT_SERVICE': ['GEC', 'CLIENTS', 'ALERTS']
    };
    
    return roleModules[selectedRole]?.includes(moduleId) || false;
  };

  const getModuleOpacity = (moduleId: string) => {
    if (!isModuleVisible(moduleId)) return 0.3;
    if (selectedModule === moduleId) return 1;
    if (showGuidedTour && selectedModule === moduleId) return 1;
    return 0.8;
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '500px', overflow: 'hidden' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* Draw connections */}
        {connections.map((conn, index) => {
          const fromModule = modules.find(m => m.id === conn.from);
          const toModule = modules.find(m => m.id === conn.to);
          if (!fromModule || !toModule) return null;
          
          return (
            <line
              key={index}
              x1={fromModule.x + 60}
              y1={fromModule.y + 30}
              x2={toModule.x + 60}
              y2={toModule.y + 30}
              stroke="#ddd"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          );
        })}
        
        {/* Arrow marker */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#ddd"
            />
          </marker>
        </defs>
      </svg>

      {/* Module nodes */}
      {modules.map((module) => (
        <Paper
          key={module.id}
          sx={{
            position: 'absolute',
            left: module.x,
            top: module.y,
            width: 120,
            height: 60,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            opacity: getModuleOpacity(module.id),
            bgcolor: selectedModule === module.id ? module.color : 'white',
            color: selectedModule === module.id ? 'white' : module.color,
            border: `2px solid ${module.color}`,
            transition: 'all 0.3s ease',
            transform: selectedModule === module.id ? 'scale(1.1)' : 'scale(1)',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: 3
            }
          }}
          onClick={() => onModuleClick(module.id)}
        >
          {React.cloneElement(module.icon, { sx: { fontSize: 20, mb: 0.5 } })}
          <Typography variant="caption" sx={{ fontSize: '0.7rem', textAlign: 'center', lineHeight: 1 }}>
            {module.name}
          </Typography>
        </Paper>
      ))}

      {/* Role indicator */}
      <Chip
        label={`Vue: ${selectedRole === 'ALL' ? 'Complète' : selectedRole.replace('_', ' ')}`}
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          bgcolor: 'primary.main',
          color: 'white'
        }}
      />

      {/* Guided tour indicator */}
      {showGuidedTour && (
        <Chip
          label="🎥 Visite en cours..."
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            bgcolor: 'success.main',
            color: 'white',
            animation: 'pulse 1s infinite'
          }}
        />
      )}
    </Box>
  );
};

export default FlowDiagram;