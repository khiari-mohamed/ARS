import React from 'react';
import { Client } from '../../types/client.d';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuthContext } from '../../contexts/AuthContext';

interface Props {
  clients: Client[];
  loading: boolean;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  onView?: (id: string) => void; // <-- add this
}

const ClientTable: React.FC<Props> = ({ clients, loading, onEdit, onDelete, onView }) => {
  const { user } = useAuthContext();
  // Adjust these role checks to match your roleMap in AuthContext
  const canEdit = user?.role === 'ADMINISTRATEUR' || user?.role === 'CHEF_EQUIPE';
  const canDelete = user?.role === 'ADMINISTRATEUR';

  return (
    <Grid container direction="column" spacing={2}>
      <Grid>
        <Typography variant="h6">
          Clients {clients.length > 0 && <span>({clients.length} found)</span>}
        </Typography>
      </Grid>
      <Grid>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Account Manager</TableCell>
              <TableCell>Reglement Delay</TableCell>
              <TableCell>Reclamation Delay</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell colSpan={5}>
                    <Skeleton variant="rectangular" height={32} />
                  </TableCell>
                </TableRow>
              ))
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography align="center">No clients found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id} hover>
                  <TableCell
                    style={{ cursor: onView ? 'pointer' : undefined, color: onView ? '#1976d2' : undefined }}
                    onClick={() => onView && onView(client.id)}
                  >
                    {client.name}
                  </TableCell>
                  <TableCell>{client.accountManager?.fullName}</TableCell>
                  <TableCell>{client.reglementDelay} days</TableCell>
                  <TableCell>{client.reclamationDelay} days</TableCell>
                  <TableCell>
                    {canEdit && (
                      <Tooltip title="Edit">
                        <IconButton onClick={() => onEdit(client)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDelete && (
                      <Tooltip title="Delete">
                        <IconButton onClick={() => onDelete(client.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Grid>
    </Grid>
  );
};

export default ClientTable;
