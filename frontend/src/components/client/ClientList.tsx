import React from 'react';
import { Client } from '../../types/client.d';
import { Table, TableHead, TableRow, TableCell, TableBody, IconButton, CircularProgress, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuthContext } from '../../contexts/AuthContext';

interface Props {
  clients: Client[];
  loading: boolean;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

const ClientList: React.FC<Props> = ({ clients, loading, onEdit, onDelete, onView }) => {
  const { user } = useAuthContext();
  const canEdit = user?.role === 'ADMINISTRATEUR' || user?.role === 'CHEF_EQUIPE';
  const canDelete = user?.role === 'ADMINISTRATEUR';

  return (
    <div style={{ position: 'relative' }}>
      {loading && <CircularProgress style={{ position: 'absolute', left: '50%', top: '50%' }} />}
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
          {clients.map((client) => (
            <TableRow key={client.id} hover>
              <TableCell
                style={{ cursor: 'pointer', color: '#1976d2' }}
                onClick={() => onView(client.id)}
              >
                {client.name}
              </TableCell>
              <TableCell>{client.accountManager?.fullName || '-'}</TableCell>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClientList;