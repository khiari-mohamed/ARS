import React from 'react';
import { ComparativeAnalytics } from '../../types/alerts.d';
import { Box, Typography, Tooltip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface Props {
  analytics?: ComparativeAnalytics;
}

const AlertComparativeAnalytics: React.FC<Props> = ({ analytics }) => {
  if (
    !analytics ||
    typeof analytics.planned !== 'number' ||
    typeof analytics.actual !== 'number' ||
    typeof analytics.gap !== 'number'
  ) {
    return null;
  }

  const isGapNegative = analytics.gap < 0;

  // For a simple bar chart, calculate relative widths
  const maxVal = Math.max(analytics.planned, analytics.actual, 1);
  const plannedWidth = (analytics.planned / maxVal) * 100;
  const actualWidth = (analytics.actual / maxVal) * 100;

  return (
    <Box mt={2}>
      <Typography variant="subtitle1" gutterBottom>
        Comparatif prévu vs réalisé (7 jours)
      </Typography>
      <Box display="flex" alignItems="center" gap={2} mt={1}>
        <Box>
          <Typography variant="body2">Prévu</Typography>
          <Box bgcolor="#1890ff" color="#fff" px={2} py={1} borderRadius={1} minWidth={48} textAlign="center">
            {analytics.planned}
          </Box>
        </Box>
        <Box>
          <Typography variant="body2">Réalisé</Typography>
          <Box bgcolor="#52c41a" color="#fff" px={2} py={1} borderRadius={1} minWidth={48} textAlign="center">
            {analytics.actual}
          </Box>
        </Box>
        <Box>
          <Typography variant="body2">Écart</Typography>
          <Tooltip title="Écart = Prévu - Réalisé">
            <Box
              bgcolor={isGapNegative ? "#ff4d4f" : "#faad14"}
              color="#fff"
              px={2}
              py={1}
              borderRadius={1}
              minWidth={48}
              textAlign="center"
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={0.5}
            >
              {analytics.gap}
              {isGapNegative && (
                <WarningAmberIcon fontSize="small" sx={{ ml: 0.5 }} />
              )}
            </Box>
          </Tooltip>
        </Box>
      </Box>
      {/* Simple bar chart for visual comparison */}
      <Box mt={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            bgcolor="#1890ff"
            height={10}
            width={`${plannedWidth}%`}
            borderRadius={2}
            title="Prévu"
          />
          <Box
            bgcolor="#52c41a"
            height={10}
            width={`${actualWidth}%`}
            borderRadius={2}
            title="Réalisé"
          />
        </Box>
        <Box display="flex" justifyContent="space-between" fontSize={12} mt={0.5}>
          <span style={{ color: "#1890ff" }}>Prévu</span>
          <span style={{ color: "#52c41a" }}>Réalisé</span>
        </Box>
      </Box>
    </Box>
  );
};

export default AlertComparativeAnalytics;