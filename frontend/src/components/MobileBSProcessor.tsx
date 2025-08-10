import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  SwipeableDrawer,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  SwipeLeft,
  SwipeRight,
  Check,
  Close,
  Edit,
  CloudOff,
  Sync,
  TouchApp
} from '@mui/icons-material';
import { fetchBSList, updateBS, markBSAsProcessed } from '../services/bordereauxService';

interface Props {
  bordereauId: string;
  onComplete: () => void;
}

interface BS {
  id: string;
  reference: string;
  montant: number;
  statut: string;
  beneficiaire: string;
  dateService: string;
  notes?: string;
}

const MobileBSProcessor: React.FC<Props> = ({ bordereauId, onComplete }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [bsList, setBSList] = useState<BS[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<BS>>({});

  useEffect(() => {
    loadBSList();
    
    // Offline detection
    const handleOnline = () => {
      setOffline(false);
      syncPendingActions();
    };
    const handleOffline = () => setOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [bordereauId]);

  const loadBSList = async () => {
    try {
      const data = await fetchBSList(bordereauId);
      setBSList(data);
    } catch (error) {
      console.error('Failed to load BS list:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncPendingActions = async () => {
    if (pendingActions.length === 0) return;
    
    try {
      for (const action of pendingActions) {
        if (action.type === 'approve') {
          await markBSAsProcessed(action.bsId, 'APPROVED');
        } else if (action.type === 'reject') {
          await markBSAsProcessed(action.bsId, 'REJECTED');
        } else if (action.type === 'edit') {
          await updateBS(action.bsId, action.data);
        }
      }
      setPendingActions([]);
    } catch (error) {
      console.error('Failed to sync pending actions:', error);
    }
  };

  const handleSwipeApprove = (bs: BS) => {
    if (offline) {
      setPendingActions(prev => [...prev, { type: 'approve', bsId: bs.id, timestamp: Date.now() }]);
    } else {
      markBSAsProcessed(bs.id, 'APPROVED');
    }
    
    setBSList(prev => prev.map(b => 
      b.id === bs.id ? { ...b, statut: 'APPROVED' } : b
    ));
    
    if (currentIndex < bsList.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSwipeReject = (bs: BS) => {
    if (offline) {
      setPendingActions(prev => [...prev, { type: 'reject', bsId: bs.id, timestamp: Date.now() }]);
    } else {
      markBSAsProcessed(bs.id, 'REJECTED');
    }
    
    setBSList(prev => prev.map(b => 
      b.id === bs.id ? { ...b, statut: 'REJECTED' } : b
    ));
    
    if (currentIndex < bsList.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleEdit = (bs: BS) => {
    setEditData(bs);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (offline) {
      setPendingActions(prev => [...prev, { 
        type: 'edit', 
        bsId: editData.id, 
        data: editData, 
        timestamp: Date.now() 
      }]);
    } else {
      await updateBS(editData.id!, editData);
    }
    
    setBSList(prev => prev.map(b => 
      b.id === editData.id ? { ...b, ...editData } : b
    ));
    
    setEditDialogOpen(false);
    setEditData({});
  };

  const currentBS = bsList[currentIndex];
  const progress = bsList.length > 0 ? ((currentIndex + 1) / bsList.length) * 100 : 0;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography>Chargement des BS...</Typography>
      </Box>
    );
  }

  if (!currentBS) {
    return (
      <Box textAlign="center" p={4}>
        <Typography variant="h6">Traitement terminé!</Typography>
        <Button variant="contained" onClick={onComplete} sx={{ mt: 2 }}>
          Retour
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.default',
      position: 'relative'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6">
          BS {currentIndex + 1} / {bsList.length}
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {offline && <CloudOff fontSize="small" />}
          {pendingActions.length > 0 && (
            <Chip 
              label={`${pendingActions.length} en attente`}
              size="small"
              color="warning"
            />
          )}
        </Box>
      </Box>

      {/* Progress Bar */}
      <Box sx={{ 
        height: 4, 
        bgcolor: 'grey.200',
        position: 'relative'
      }}>
        <Box sx={{ 
          height: '100%', 
          bgcolor: 'success.main',
          width: `${progress}%`,
          transition: 'width 0.3s ease'
        }} />
      </Box>

      {/* BS Card */}
      <Box sx={{ 
        flex: 1, 
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Card 
          sx={{ 
            width: '100%',
            maxWidth: 400,
            position: 'relative',
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' }
          }}
          onTouchStart={(e) => {
            const startX = e.touches[0].clientX;
            const startY = e.touches[0].clientY;
            let moved = false;
            
            const handleTouchMove = (e: TouchEvent) => {
              const currentX = e.touches[0].clientX;
              const currentY = e.touches[0].clientY;
              const diffX = currentX - startX;
              const diffY = Math.abs(currentY - startY);
              
              // Only process horizontal swipes
              if (diffY < 50) {
                moved = true;
                const card = e.target as HTMLElement;
                const cardElement = card.closest('.MuiCard-root') as HTMLElement;
                if (cardElement) {
                  cardElement.style.transform = `translateX(${diffX}px) rotate(${diffX * 0.1}deg)`;
                  cardElement.style.opacity = `${1 - Math.abs(diffX) / 300}`;
                }
              }
            };
            
            const handleTouchEnd = (e: TouchEvent) => {
              if (moved) {
                const currentX = e.changedTouches[0].clientX;
                const diffX = currentX - startX;
                const card = e.target as HTMLElement;
                const cardElement = card.closest('.MuiCard-root') as HTMLElement;
                
                if (cardElement) {
                  if (diffX > 100) {
                    // Swipe right - approve
                    cardElement.style.transform = 'translateX(100vw) rotate(30deg)';
                    setTimeout(() => handleSwipeApprove(currentBS), 300);
                  } else if (diffX < -100) {
                    // Swipe left - reject
                    cardElement.style.transform = 'translateX(-100vw) rotate(-30deg)';
                    setTimeout(() => handleSwipeReject(currentBS), 300);
                  } else {
                    // Snap back
                    cardElement.style.transform = 'translateX(0) rotate(0deg)';
                    cardElement.style.opacity = '1';
                  }
                }
              }
              
              document.removeEventListener('touchmove', handleTouchMove);
              document.removeEventListener('touchend', handleTouchEnd);
            };
            
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);
          }}
        >
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
              <Typography variant="h6" fontWeight={600}>
                {currentBS.reference}
              </Typography>
              <Chip 
                label={currentBS.statut}
                color={currentBS.statut === 'PENDING' ? 'warning' : 'default'}
                size="small"
              />
            </Box>

            <Box mb={3}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Bénéficiaire
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {currentBS.beneficiaire}
              </Typography>
            </Box>

            <Box mb={3}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Montant
              </Typography>
              <Typography variant="h5" color="primary" fontWeight={600}>
                {currentBS.montant.toLocaleString()} DA
              </Typography>
            </Box>

            <Box mb={3}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Date de service
              </Typography>
              <Typography variant="body1">
                {new Date(currentBS.dateService).toLocaleDateString()}
              </Typography>
            </Box>

            {currentBS.notes && (
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Notes
                </Typography>
                <Typography variant="body2">
                  {currentBS.notes}
                </Typography>
              </Box>
            )}

            {/* Touch Instructions */}
            <Box 
              display="flex" 
              justifyContent="center" 
              alignItems="center" 
              gap={1}
              mt={3}
              p={2}
              bgcolor="grey.50"
              borderRadius={1}
            >
              <TouchApp color="action" />
              <Typography variant="caption" color="text.secondary">
                Glissez à droite pour approuver, à gauche pour rejeter
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ 
        p: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider'
      }}>
        <Button
          variant="outlined"
          color="error"
          startIcon={<Close />}
          onClick={() => handleSwipeReject(currentBS)}
          sx={{ flex: 1, mr: 1 }}
        >
          Rejeter
        </Button>
        
        <IconButton
          onClick={() => handleEdit(currentBS)}
          sx={{ mx: 1 }}
        >
          <Edit />
        </IconButton>
        
        <Button
          variant="contained"
          color="success"
          startIcon={<Check />}
          onClick={() => handleSwipeApprove(currentBS)}
          sx={{ flex: 1, ml: 1 }}
        >
          Approuver
        </Button>
      </Box>

      {/* Sync FAB */}
      {offline && pendingActions.length > 0 && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 80, right: 16 }}
          onClick={syncPendingActions}
        >
          <Sync />
        </Fab>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth>
        <DialogTitle>Modifier BS</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Bénéficiaire"
            value={editData.beneficiaire || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, beneficiaire: e.target.value }))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Montant"
            type="number"
            value={editData.montant || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, montant: parseFloat(e.target.value) }))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={3}
            value={editData.notes || ''}
            onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Sauvegarder</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileBSProcessor;