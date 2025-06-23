import React from 'react';
import { ReclamationAlert } from '../../types/alerts.d';
import { List, ListItem, ListItemText, Chip, Typography, Link, Box } from '@mui/material';
import { alertLevelColor } from '../../utils/alertUtils';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface Props {
  reclamations?: ReclamationAlert[];
}

const ReclamationAlerts: React.FC<Props> = ({ reclamations }) => {
  if (!reclamations || reclamations.length === 0) {
    return <Typography>Aucune réclamation en cours.</Typography>;
  }

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Alertes réclamations
      </Typography>
      <List>
        {reclamations.map((r, idx) => {
          const reclamationId = r.reclamation.id || idx;
          const clientId = r.reclamation.clientId;
          const courrierId = r.reclamation.courrierId || r.reclamation.id; // fallback if courrierId not present

          return (
            <ListItem key={reclamationId} divider alignItems="flex-start">
              <Chip
                label="Réclamation"
                sx={{
                  backgroundColor: alertLevelColor('red'),
                  color: '#fff',
                  mr: 2,
                  minWidth: 100,
                }}
              />
              <Box flex={1}>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <span>
                        Réclamation #{reclamationId}
                        {clientId && (
                          <Link
                            href={`/clients/${clientId}`}
                            target="_blank"
                            rel="noopener"
                            underline="hover"
                            sx={{ ml: 1 }}
                          >
                            Voir client <OpenInNewIcon fontSize="inherit" sx={{ verticalAlign: 'middle' }} />
                          </Link>
                        )}
                        {courrierId && (
                          <Link
                            href={`/reclamations/${courrierId}`}
                            target="_blank"
                            rel="noopener"
                            underline="hover"
                            sx={{ ml: 2 }}
                          >
                            Voir courrier <OpenInNewIcon fontSize="inherit" sx={{ verticalAlign: 'middle' }} />
                          </Link>
                        )}
                      </span>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.secondary">
                        {r.reason}
                      </Typography>
                      <Box mt={0.5}>
                        <Chip
                          label={`Statut: ${r.status || 'Inconnu'}`}
                          size="small"
                          color="default"
                          sx={{ ml: 0, background: '#eee', color: '#333' }}
                        />
                      </Box>
                    </>
                  }
                />
              </Box>
            </ListItem>
          );
        })}
      </List>
    </>
  );
};

export default ReclamationAlerts;