import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, ROLE_LABELS } from '../../types/user.d';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  ExpandMore,
  Security,
  Person,
  Business,
  Assignment,
  AccountBalance,
  Scanner,
  Description,
  SupervisorAccount,
  AdminPanelSettings
} from '@mui/icons-material';

interface RolePermission {
  module: string;
  permissions: string[];
  description: string;
}

const rolePermissions: Record<UserRole, RolePermission[]> = {
  SUPER_ADMIN: [
    {
      module: 'Système',
      permissions: ['Accès total', 'Configuration système', 'Gestion des utilisateurs', 'Audit complet'],
      description: 'Contrôle total sur tous les aspects du système'
    },
    {
      module: 'Utilisateurs',
      permissions: ['Créer', 'Modifier', 'Supprimer', 'Réinitialiser mots de passe', 'Gérer les rôles'],
      description: 'Gestion complète des utilisateurs et des permissions'
    },
    {
      module: 'Bordereaux',
      permissions: ['Voir tous', 'Modifier tous', 'Réaffecter', 'Débloquer', 'Archiver'],
      description: 'Accès et contrôle total sur tous les bordereaux'
    },
    {
      module: 'Finance',
      permissions: ['Voir tous les virements', 'Confirmer', 'Rejeter', 'Générer rapports'],
      description: 'Supervision complète des opérations financières'
    },
    {
      module: 'Réclamations',
      permissions: ['Voir toutes', 'Traiter', 'Réaffecter', 'Clôturer'],
      description: 'Gestion complète des réclamations'
    },
    {
      module: 'Rapports',
      permissions: ['Tous les rapports', 'Export avancé', 'Planification'],
      description: 'Accès à tous les rapports et analyses'
    }
  ],
  ADMINISTRATEUR: [
    {
      module: 'Utilisateurs',
      permissions: ['Créer', 'Modifier (sauf Super Admin)', 'Réinitialiser mots de passe'],
      description: 'Gestion des utilisateurs avec restrictions'
    },
    {
      module: 'Bordereaux',
      permissions: ['Voir tous', 'Réaffecter', 'Débloquer situations'],
      description: 'Supervision et déblocage des bordereaux'
    },
    {
      module: 'Rapports',
      permissions: ['Rapports globaux', 'Export standard'],
      description: 'Accès aux rapports de gestion'
    },
    {
      module: 'Configuration',
      permissions: ['Paramètres métier', 'Templates'],
      description: 'Configuration des paramètres applicatifs'
    }
  ],
  RESPONSABLE_DEPARTEMENT: [
    {
      module: 'Équipe',
      permissions: ['Voir son département', 'Affecter tâches', 'Suivre performance'],
      description: 'Gestion de son département'
    },
    {
      module: 'Bordereaux',
      permissions: ['Voir département', 'Réaffecter dans équipe'],
      description: 'Gestion des bordereaux de son département'
    },
    {
      module: 'Rapports',
      permissions: ['Rapports département', 'Performance équipe'],
      description: 'Rapports limités à son périmètre'
    }
  ],
  CHEF_EQUIPE: [
    {
      module: 'Équipe',
      permissions: ['Voir son équipe', 'Affecter bordereaux', 'Suivre charge de travail'],
      description: 'Gestion de son équipe de gestionnaires'
    },
    {
      module: 'Bordereaux',
      permissions: ['Voir équipe', 'Affecter', 'Débloquer simples'],
      description: 'Affectation et suivi des bordereaux de son équipe'
    },
    {
      module: 'Réclamations',
      permissions: ['Voir équipe', 'Traiter', 'Réaffecter'],
      description: 'Gestion des réclamations de son équipe'
    }
  ],
  GESTIONNAIRE: [
    {
      module: 'Bordereaux',
      permissions: ['Voir affectés', 'Traiter', 'Retourner', 'Rejeter'],
      description: 'Traitement des bordereaux qui lui sont affectés'
    },
    {
      module: 'Documents',
      permissions: ['Consulter', 'Télécharger', 'Annoter'],
      description: 'Accès aux documents des dossiers affectés'
    },
    {
      module: 'Tableau de bord',
      permissions: ['Vue personnelle', 'Statistiques individuelles'],
      description: 'Suivi de sa propre activité'
    }
  ],
  CLIENT_SERVICE: [
    {
      module: 'Réclamations',
      permissions: ['Voir toutes', 'Créer', 'Traiter', 'Suivre'],
      description: 'Gestion complète des réclamations clients'
    },
    {
      module: 'Clients',
      permissions: ['Consulter', 'Historique réclamations'],
      description: 'Accès aux informations clients'
    },
    {
      module: 'Communication',
      permissions: ['Envoyer courriers', 'Templates'],
      description: 'Communication avec les clients'
    }
  ],
  FINANCE: [
    {
      module: 'Virements',
      permissions: ['Voir tous', 'Confirmer', 'Rejeter', 'Générer ordres'],
      description: 'Gestion exclusive des virements'
    },
    {
      module: 'Rapports financiers',
      permissions: ['Rapports virements', 'Suivi paiements', 'Export comptable'],
      description: 'Rapports et analyses financières'
    },
    {
      module: 'Bordereaux',
      permissions: ['Voir prêts virement', 'Consulter montants'],
      description: 'Consultation des bordereaux prêts pour virement'
    }
  ],
  SCAN_TEAM: [
    {
      module: 'Numérisation',
      permissions: ['Scanner documents', 'Indexer', 'Contrôle qualité'],
      description: 'Numérisation et indexation des documents'
    },
    {
      module: 'Bordereaux',
      permissions: ['Voir à scanner', 'Mettre à jour statut'],
      description: 'Gestion du flux de numérisation'
    },
    {
      module: 'OCR',
      permissions: ['Lancer OCR', 'Corriger résultats'],
      description: 'Traitement OCR des documents'
    }
  ],
  BO: [
    {
      module: 'Saisie',
      permissions: ['Créer bordereaux', 'Saisie initiale', 'Notification SCAN'],
      description: 'Point d\'entrée du flux documentaire'
    },
    {
      module: 'Bordereaux',
      permissions: ['Voir créés', 'Modifier en attente'],
      description: 'Gestion des bordereaux en phase initiale'
    },
    {
      module: 'Tableau de bord',
      permissions: ['Métriques saisie', 'Performance BO'],
      description: 'Suivi de l\'activité de saisie'
    }
  ]
};

const roleIcons: Record<UserRole, React.ReactElement> = {
  SUPER_ADMIN: <AdminPanelSettings color="error" />,
  ADMINISTRATEUR: <SupervisorAccount color="warning" />,
  RESPONSABLE_DEPARTEMENT: <Business color="info" />,
  CHEF_EQUIPE: <Person color="primary" />,
  GESTIONNAIRE: <Assignment color="success" />,
  CLIENT_SERVICE: <Person color="info" />,
  FINANCE: <AccountBalance color="warning" />,
  SCAN_TEAM: <Scanner color="action" />,
  BO: <Description color="action" />
};

export default function UserRoles() {
  const { user: currentUser } = useAuth();
  const [expandedRole, setExpandedRole] = useState<string | false>(false);

  if (currentUser?.role !== 'SUPER_ADMIN') {
    return (
      <Box p={3}>
        <Alert severity="error">
          Accès réservé aux Super Administrateurs
        </Alert>
      </Box>
    );
  }

  const handleAccordionChange = (role: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedRole(isExpanded ? role : false);
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Gestion des Rôles et Permissions
      </Typography>

      <Typography variant="body1" color="text.secondary" paragraph>
        Vue d'ensemble des rôles système et de leurs permissions associées.
      </Typography>

      {/* Role Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <Grid item xs={12} sm={6} md={4} key={role}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  {roleIcons[role as UserRole]}
                  <Typography variant="h6">
                    {label}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {rolePermissions[role as UserRole]?.length || 0} modules accessibles
                </Typography>
                <Chip 
                  label={role} 
                  size="small" 
                  variant="outlined" 
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Detailed Permissions */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Permissions Détaillées
      </Typography>

      {Object.entries(rolePermissions).map(([role, permissions]) => (
        <Accordion
          key={role}
          expanded={expandedRole === role}
          onChange={handleAccordionChange(role)}
          sx={{ mb: 1 }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={2}>
              {roleIcons[role as UserRole]}
              <Typography variant="h6">
                {ROLE_LABELS[role as UserRole]}
              </Typography>
              <Chip 
                label={`${permissions.length} modules`} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Module</strong></TableCell>
                    <TableCell><strong>Permissions</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {permissions.map((perm, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {perm.module}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          {perm.permissions.map((p, i) => (
                            <Chip 
                              key={i}
                              label={p} 
                              size="small" 
                              variant="outlined"
                              color="primary"
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {perm.description}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Role Hierarchy */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Hiérarchie des Rôles
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Les rôles sont organisés selon une hiérarchie de permissions. Un utilisateur avec un rôle supérieur peut généralement gérer les utilisateurs des rôles inférieurs.
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon><AdminPanelSettings color="error" /></ListItemIcon>
              <ListItemText 
                primary="Super Administrateur" 
                secondary="Niveau 10 - Accès total au système"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><SupervisorAccount color="warning" /></ListItemIcon>
              <ListItemText 
                primary="Administrateur" 
                secondary="Niveau 8 - Gestion système avec restrictions"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Business color="info" /></ListItemIcon>
              <ListItemText 
                primary="Responsable Département" 
                secondary="Niveau 6 - Gestion départementale"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Person color="primary" /></ListItemIcon>
              <ListItemText 
                primary="Chef d'Équipe" 
                secondary="Niveau 5 - Gestion d'équipe"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Assignment color="success" /></ListItemIcon>
              <ListItemText 
                primary="Gestionnaire / Service Client / Finance" 
                secondary="Niveau 3 - Rôles opérationnels"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><Scanner color="action" /></ListItemIcon>
              <ListItemText 
                primary="Équipe Scan / Bureau d'Ordre" 
                secondary="Niveau 2 - Rôles techniques"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}