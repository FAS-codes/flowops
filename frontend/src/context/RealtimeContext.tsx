import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket } from '../lib/socket';

interface RealtimeState {
  onlineIds: string[];
  isOnline: (userId: string) => boolean;
}

const RealtimeContext = createContext<RealtimeState>({
  onlineIds: [],
  isOnline: () => false,
});

interface NotificationPayload {
  title: string;
  body?: string;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user, activeOrg } = useAuth();
  const qc = useQueryClient();
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const orgKey = activeOrg?.id;
  // Keep a ref so listeners always see the current query client without re-binding.
  const qcRef = useRef(qc);
  qcRef.current = qc;

  useEffect(() => {
    if (!user || !orgKey) return;
    const socket = connectSocket();

    const invalidate = (keys: unknown[][]) =>
      keys.forEach((queryKey) => qcRef.current.invalidateQueries({ queryKey }));

    const onLead = () => invalidate([['crm-board'], ['dashboard']]);
    const onTask = () => invalidate([['tasks'], ['projects'], ['dashboard']]);
    const onProject = () => invalidate([['projects'], ['project'], ['dashboard']]);
    const onActivity = () => invalidate([['dashboard', 'activity'], ['audit']]);
    const onPresence = (ids: string[]) => setOnlineIds(ids);
    const onNotification = (n: NotificationPayload) => {
      invalidate([['notifications']]);
      toast(n.title + (n.body ? ` — ${n.body}` : ''), { icon: '🔔' });
    };

    socket.on('lead:changed', onLead);
    socket.on('task:changed', onTask);
    socket.on('project:changed', onProject);
    socket.on('activity:new', onActivity);
    socket.on('presence:update', onPresence);
    socket.on('notification:new', onNotification);

    return () => {
      socket.off('lead:changed', onLead);
      socket.off('task:changed', onTask);
      socket.off('project:changed', onProject);
      socket.off('activity:new', onActivity);
      socket.off('presence:update', onPresence);
      socket.off('notification:new', onNotification);
      // Full teardown when the user or active org changes (new handshake needed).
      disconnectSocket();
      setOnlineIds([]);
    };
  }, [user, orgKey]);

  const value = useMemo<RealtimeState>(
    () => ({ onlineIds, isOnline: (id: string) => onlineIds.includes(id) }),
    [onlineIds]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRealtime() {
  return useContext(RealtimeContext);
}
