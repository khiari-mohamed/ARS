import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Badge,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Tooltip,
  Divider,
  Chip,
  TextField,
  InputAdornment,
  Stack
} from '@mui/material';
import { 
  NotificationsActive, 
  CheckCircleOutline, 
  FiberManualRecord,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { LocalAPI } from '../../services/axios';

export interface ValidationNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: {
    ordreVirementId?: string;
    reference?: string;
  };
  validationState?: {
    alreadyValidated: boolean;
    validationStatus: string | null;
    etatVirement: string | null;
  };
}

interface ValidationNotificationsBellProps {
  userId: string;
  onOpenValidation: (notification: ValidationNotification) => void;
}

type TimeFilter = 'all' | 'hour' | 'today' | 'week';

// Fast shallow-equality check to avoid unnecessary React re-renders every 3s
const areNotificationsEqual = (
  prev: ValidationNotification[],
  next: ValidationNotification[]
): boolean => {
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (
      a.id !== b.id ||
      a.read !== b.read ||
      a.createdAt !== b.createdAt ||
      a.validationState?.alreadyValidated !== b.validationState?.alreadyValidated
    ) {
      return false;
    }
  }
  return true;
};

const ValidationNotificationsBell: React.FC<ValidationNotificationsBellProps> = ({
  userId,
  onOpenValidation
}) => {
  const [notifications, setNotifications] = useState<ValidationNotification[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  
  const isFetchingRef = useRef(false);
  const requestId = useRef(0);

  // 1. Fetching logic with collision & overlap prevention
  const loadNotifications = useCallback(async () => {
    if (isFetchingRef.current || document.hidden) return;

    isFetchingRef.current = true;
    const currentRequestId = ++requestId.current;

    try {
      const { data } = await LocalAPI.get<ValidationNotification[]>('/finance/validation/notifications');
      
      if (currentRequestId === requestId.current && Array.isArray(data)) {
        setNotifications(prev => (areNotificationsEqual(prev, data) ? prev : data));
      }
    } catch {
      // Retain last successful cache state
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // 2. Lifecycle & Polling with Tab Visibility Awareness
  useEffect(() => {
    loadNotifications();

    const interval = window.setInterval(loadNotifications, 3000);

    const handleVisibilityChange = () => {
      if (!document.hidden) loadNotifications();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      requestId.current += 1;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, loadNotifications]);

  // 3. Memoized global metrics (based on ALL notifications, not filtered)
  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );

  const latestNotificationId = useMemo(() => {
    if (notifications.length === 0) return null;
    let latest = notifications[0];
    for (let i = 1; i < notifications.length; i++) {
      if (new Date(notifications[i].createdAt).getTime() > new Date(latest.createdAt).getTime()) {
        latest = notifications[i];
      }
    }
    return latest.id;
  }, [notifications]);

  // 4. Filtered notifications (Search + Time)
  const filteredNotifications = useMemo(() => {
    const now = Date.now();
    const query = searchQuery.trim().toLowerCase();

    // Time thresholds
    let timeThreshold = 0;
    switch (timeFilter) {
      case 'hour':
        timeThreshold = now - 60 * 60 * 1000;
        break;
      case 'today': {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        timeThreshold = startOfDay.getTime();
        break;
      }
      case 'week':
        timeThreshold = now - 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        timeThreshold = 0;
    }

    return notifications.filter(n => {
      // Time filter check
      if (timeThreshold > 0) {
        const created = new Date(n.createdAt).getTime();
        if (created < timeThreshold) return false;
      }

      // Text search check
      if (query) {
        const title = (n.title || '').toLowerCase();
        const message = (n.message || '').toLowerCase();
        const reference = (n.data?.reference || '').toLowerCase();
        const ovId = (n.data?.ordreVirementId || '').toLowerCase();

        if (
          !title.includes(query) &&
          !message.includes(query) &&
          !reference.includes(query) &&
          !ovId.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [notifications, searchQuery, timeFilter]);

  // 5. Mark as read handler (Optimistic UI update)
  const handleMarkAsRead = useCallback(async (e: React.MouseEvent, notification: ValidationNotification) => {
    e.stopPropagation();
    if (notification.read) return;

    setNotifications(prev =>
      prev.map(item => (item.id === notification.id ? { ...item, read: true } : item))
    );

    try {
      await LocalAPI.patch(`/users/${userId}/notifications/${notification.id}/read`);
    } catch {
      setNotifications(prev =>
        prev.map(item => (item.id === notification.id ? { ...item, read: false } : item))
      );
    }
  }, [userId]);

  // 6. Open validation handler
  const handleClick = useCallback(async (notification: ValidationNotification) => {
    setAnchorEl(null);

    if (!notification.read) {
      setNotifications(prev =>
        prev.map(item => (item.id === notification.id ? { ...item, read: true } : item))
      );

      try {
        await LocalAPI.patch(`/users/${userId}/notifications/${notification.id}/read`);
      } catch {
        // Validation modal can still be opened even if mark-as-read fails
      }
    }

    if (notification.data?.ordreVirementId) {
      onOpenValidation(notification);
    }
  }, [userId, onOpenValidation]);

  // Reset filters when menu closes (optional UX behavior)
  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const timeFilters: { key: TimeFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'hour', label: 'Dernière heure' },
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week', label: '7 derniers jours' }
  ];

  return (
    <>
      <IconButton
        onClick={event => setAnchorEl(event.currentTarget)}
        title="Notifications de validation des virements"
        color="warning"
        sx={{
          transition: 'transform 0.15s ease-in-out',
          '&:hover': { transform: 'scale(1.05)' }
        }}
      >
        <Badge badgeContent={unreadCount} color="error" max={999}>
          <NotificationsActive />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            width: 420,
            maxHeight: 620,
            borderRadius: '12px',
            boxShadow: '0px 8px 24px rgba(0,0,0,0.12)',
            overflowY: 'auto'
          }
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, pt: 1.5, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Validations ({filteredNotifications.length}
            {filteredNotifications.length !== notifications.length && `/${notifications.length}`})
          </Typography>
          {unreadCount > 0 && (
            <Chip 
              label={`${unreadCount} non lue(s)`} 
              color="warning" 
              size="small" 
              sx={{ fontWeight: 'bold', fontSize: '0.75rem' }} 
            />
          )}
        </Box>

        {/* Search Field */}
        <Box sx={{ px: 2, pb: 1 }} onKeyDown={e => e.stopPropagation()}>
          <TextField
            size="small"
            fullWidth
            placeholder="Rechercher par OV, référence, titre..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onClick={e => e.stopPropagation()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
              sx: { borderRadius: 2, fontSize: '0.875rem' }
            }}
          />
        </Box>

        {/* Time Filter Chips */}
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {timeFilters.map(f => (
              <Chip
                key={f.key}
                label={f.label}
                size="small"
                clickable
                variant={timeFilter === f.key ? 'filled' : 'outlined'}
                color={timeFilter === f.key ? 'warning' : 'default'}
                onClick={(e) => { e.stopPropagation(); setTimeFilter(f.key); }}
                sx={{ 
                  fontSize: '0.7rem', 
                  height: 24,
                  fontWeight: timeFilter === f.key ? 700 : 400
                }}
              />
            ))}
          </Stack>
        </Box>

        <Divider />

        {/* List */}
        {notifications.length === 0 ? (
          <Box sx={{ py: 4, px: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Aucune validation en attente
            </Typography>
          </Box>
        ) : filteredNotifications.length === 0 ? (
          <Box sx={{ py: 4, px: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Aucun résultat pour ces filtres
            </Typography>
            <Typography 
              variant="caption" 
              color="primary" 
              sx={{ cursor: 'pointer', mt: 1, display: 'inline-block' }}
              onClick={() => { setSearchQuery(''); setTimeFilter('all'); }}
            >
              Réinitialiser les filtres
            </Typography>
          </Box>
        ) : (
          filteredNotifications.map(notification => {
            const isLatest = notification.id === latestNotificationId;
            const isUnread = !notification.read;
            const isAlreadyValidated = notification.validationState?.alreadyValidated === true;

            return (
              <React.Fragment key={notification.id}>
                <MenuItem
                  onClick={() => handleClick(notification)}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    py: 1.5,
                    px: 2,
                    gap: 1.5,
                    position: 'relative',
                    transition: 'background-color 0.15s ease',
                    backgroundColor: isAlreadyValidated
                      ? 'rgba(211, 47, 47, 0.08)'
                      : isLatest && isUnread
                        ? 'rgba(237, 108, 2, 0.08)'
                        : isUnread 
                          ? 'rgba(0, 0, 0, 0.02)' 
                          : 'inherit',
                    borderLeft: isAlreadyValidated
                      ? '4px solid #d32f2f'
                      : isUnread
                        ? '4px solid #ed6c02'
                        : '4px solid transparent',
                    '&:hover': {
                      backgroundColor: isAlreadyValidated
                        ? 'rgba(211, 47, 47, 0.14)'
                        : isUnread
                          ? 'rgba(237, 108, 2, 0.12)'
                          : 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                >
                  {/* Status Indicator */}
                  <Box sx={{ mt: 0.5 }}>
                    {isAlreadyValidated ? (
                      <FiberManualRecord sx={{ color: '#d32f2f', fontSize: 12 }} />
                    ) : isUnread ? (
                      <FiberManualRecord sx={{ color: '#ed6c02', fontSize: 12 }} />
                    ) : (
                      <FiberManualRecord sx={{ color: 'text.disabled', fontSize: 12 }} />
                    )}
                  </Box>

                  {/* Body Details */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          fontWeight: isUnread ? 700 : 500,
                          color: isAlreadyValidated
                            ? '#d32f2f'
                            : isUnread
                              ? 'text.primary'
                              : 'text.secondary',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}
                      >
                        {notification.title || 'Nouvel OV à valider'}
                      </Typography>

                      {isAlreadyValidated ? (
                        <Chip
                          label="Déjà validé"
                          color="error"
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 'bold' }}
                        />
                      ) : (
                        isLatest && isUnread && (
                          <Chip 
                            label="Nouveau" 
                            color="warning" 
                            size="small" 
                            variant="outlined" 
                            sx={{ height: 16, fontSize: '0.65rem', fontWeight: 'bold' }} 
                          />
                        )
                      )}
                    </Box>

                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: isUnread ? 500 : 400,
                        color: isAlreadyValidated 
                          ? 'error.main' 
                          : isUnread 
                            ? 'text.primary' 
                            : 'text.secondary',
                        mb: 0.5, 
                        display: '-webkit-box', 
                        WebkitLineClamp: 2, 
                        WebkitBoxOrient: 'vertical', 
                        overflow: 'hidden',
                        lineHeight: 1.3
                      }}
                    >
                      {notification.message}
                    </Typography>

                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                      {new Date(notification.createdAt).toLocaleString('fr-FR')}
                    </Typography>
                  </Box>

                  {/* Mark as read button */}
                  {isUnread && (
                    <Tooltip title="Marquer comme lu" placement="top">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMarkAsRead(e, notification)}
                        sx={{ 
                          alignSelf: 'center',
                          color: 'text.secondary',
                          '&:hover': { color: 'success.main', backgroundColor: 'rgba(46, 125, 50, 0.08)' } 
                        }}
                      >
                        <CheckCircleOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </MenuItem>
                <Divider sx={{ my: 0 }} />
              </React.Fragment>
            );
          })
        )}
      </Menu>
    </>
  );
};

export default ValidationNotificationsBell;