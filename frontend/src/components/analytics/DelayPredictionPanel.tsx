import React from 'react';
import { DelayPrediction } from '../../types/alerts.d';
import { Box, Typography, Alert, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface Props {
  prediction?: DelayPrediction;
}

const DelayPredictionPanel: React.FC<Props> = ({ prediction }) => {
  if (
    !prediction ||
    typeof prediction.nextWeekForecast !== 'number' ||
    typeof prediction.slope !== 'number' ||
    typeof prediction.intercept !== 'number'
  ) {
    return null;
  }

  const isOk = prediction.recommendation === 'All OK';

  return (
    <Box mt={2}>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="subtitle1">
          Prédiction IA de charge (7 jours)
        </Typography>
        <Tooltip
          title={
            <>
              <div>
                <b>Prédiction basée sur une régression linéaire</b>
              </div>
              <div>
                Slope&nbsp;: <b>{prediction.slope.toFixed(2)}</b> &nbsp;|&nbsp; Intercept&nbsp;: <b>{prediction.intercept.toFixed(2)}</b>
              </div>
              <div>
                Le volume prévisionnel est calculé à partir des tendances des 30 derniers jours.
              </div>
            </>
          }
          arrow
        >
          <InfoOutlinedIcon fontSize="small" color="action" />
        </Tooltip>
      </Box>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        Volume prévisionnel (7 jours) : <b>{prediction.nextWeekForecast}</b>
      </Typography>
      <Alert
        severity={isOk ? 'success' : 'warning'}
        sx={{ mt: 1 }}
      >
        {prediction.recommendation}
      </Alert>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        <i>
          {isOk
            ? "Aucune action requise. Charge prévisionnelle normale."
            : "Attention : la charge prévue dépasse le seuil critique. Suivez la recommandation ci-dessus."}
        </i>
      </Typography>
    </Box>
  );
};

export default DelayPredictionPanel;