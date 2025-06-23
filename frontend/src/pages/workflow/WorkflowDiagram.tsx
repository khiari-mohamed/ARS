import React, { useEffect, useState, useRef } from 'react';
import ReactFlow, { MiniMap, Controls, Background } from 'react-flow-renderer';
import { Box, Typography, CircularProgress, TextField, Button } from '@mui/material';
import { getWorkflowVisualization } from '../../api/workflowApi';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

type StageStatus = 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
const statusColor: Record<StageStatus, string> = {
  'COMPLETED': '#4caf50',
  'IN_PROGRESS': '#ff9800',
  'PENDING': '#bdbdbd'
};

const statusLabel: Record<StageStatus, string> = {
  'COMPLETED': 'Terminé',
  'IN_PROGRESS': 'En cours',
  'PENDING': 'En attente'
};

const statusIcon: Record<StageStatus, JSX.Element> = {
  'COMPLETED': <CheckCircleIcon style={{ color: statusColor['COMPLETED'] }} />,
  'IN_PROGRESS': <HourglassEmptyIcon style={{ color: statusColor['IN_PROGRESS'], animation: 'spin 2s linear infinite' }} />,
  'PENDING': <RadioButtonUncheckedIcon style={{ color: statusColor['PENDING'] }} />
};

function getStatusKey(status: any): StageStatus {
  if (status === 'COMPLETED' || status === 'IN_PROGRESS' || status === 'PENDING') return status;
  return 'PENDING';
}

const defaultStages = [
  { name: 'Réception', status: 'PENDING' },
  { name: 'Scan', status: 'PENDING' },
  { name: 'Validation', status: 'PENDING' },
  { name: 'Virement', status: 'PENDING' }
];

interface WorkflowDiagramProps {
  taskId?: string;
}

const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({ taskId: propTaskId }) => {
  const [taskId, setTaskId] = useState(propTaskId || '');
  const [trace, setTrace] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (propTaskId && propTaskId !== taskId) setTaskId(propTaskId);
  }, [propTaskId]);

  const fetchTrace = async (id = taskId) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getWorkflowVisualization(id);
      setTrace(res);
    } catch {
      setTrace(null);
    }
    setLoading(false);
  };

  // Polling for real-time updates
  useEffect(() => {
    if (!taskId) return;
    fetchTrace(taskId);
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => fetchTrace(taskId), 10000); // 10s
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [taskId]);

  // Build nodes and edges for react-flow
  const buildDiagram = () => {
    if (!trace || !trace.stages) return { nodes: [], edges: [] };
    const nodes = trace.stages.map((stage: any, idx: number) => {
      const isCurrent = getStatusKey(stage.status) === 'IN_PROGRESS';
      return {
        id: String(idx),
        data: {
          label: (
            <Box display="flex" flexDirection="column" alignItems="center">
              {statusIcon[getStatusKey(stage.status)]}
              <Typography variant="subtitle2" sx={{ color: statusColor[getStatusKey(stage.status)], fontWeight: isCurrent ? 'bold' : 'normal', animation: isCurrent ? 'flash 1s infinite alternate' : undefined }}>
                {stage.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#888' }}>
                {statusLabel[getStatusKey(stage.status)]}
              </Typography>
              {stage.date && (
                <Typography variant="caption" sx={{ color: '#888' }}>
                  {new Date(stage.date).toLocaleString('fr-FR')}
                </Typography>
              )}
            </Box>
          )
        },
        position: { x: 200 * idx, y: 100 },
        style: {
          border: `2px solid ${statusColor[getStatusKey(stage.status)]}`,
          borderRadius: 12,
          padding: 8,
          background: '#fff',
          minWidth: 120,
          boxShadow: isCurrent ? '0 0 16px 2px #ff9800' : undefined
        }
      };
    });

    const edges = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        id: `e${i}-${i + 1}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        animated: getStatusKey(trace.stages[i + 1].status) === 'IN_PROGRESS',
        style: { stroke: statusColor[getStatusKey(trace.stages[i + 1].status)], strokeWidth: 2 }
      });
    }
    return { nodes, edges };
  };

  const { nodes, edges } = buildDiagram();

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>Diagramme du cycle de vie du BS</Typography>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          label="ID du Bordereau"
          value={taskId}
          onChange={e => setTaskId(e.target.value)}
          size="small"
          disabled={!!propTaskId}
        />
        <Button variant="contained" onClick={() => fetchTrace(taskId)} disabled={loading || !taskId || !!propTaskId}>
          {loading ? 'Chargement...' : 'Afficher'}
        </Button>
      </Box>
      {loading && <CircularProgress />}
      {!loading && nodes.length > 0 && (
        <Box sx={{ height: 300, background: '#f5f5f5', borderRadius: 2 }}>
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </Box>
      )}
      {!loading && !trace && (
        <Typography variant="body2" color="textSecondary">
          Entrez un ID de bordereau pour visualiser le diagramme.
        </Typography>
      )}
      <style>{`
        @keyframes flash {
          from { background: #fff; }
          to { background: #ffe082; }
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default WorkflowDiagram;