import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authStorage } from '@/lib/auth';
import { toast } from 'sonner';

type MessageHandler = (data: any) => void;

interface SocketContextType {
  isConnected: boolean;
  subscribe: (handler: MessageHandler) => () => void;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  subscribe: () => () => { },
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const token = authStorage.getToken();
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<MessageHandler>>(new Set());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  // Stable subscribe function — components call this to receive all WS messages
  const subscribe = useCallback((handler: MessageHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  useEffect(() => {
    if (!token || !user) {
      socketRef.current?.close();
      return;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      const defaultWs = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api`;
      const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || defaultWs;
      // Remove '/api' from the end of VITE_WS_BASE_URL if it exists, since we'll append /api/v1/...
      const baseUrl = wsBaseUrl.replace(/\/api\/?$/, '');
      const wsUrl = `${baseUrl}/api/v1/notifications/ws?token=${token}`;

      console.log('Connecting to WebSocket:', wsUrl);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (cancelled) { socket.close(); return; }
        console.log('WebSocket Connected');
        setIsConnected(true);
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Dispatch to all subscribers (e.g. OfficerTracking page)
          handlersRef.current.forEach((handler) => {
            try { handler(data); } catch (e) { console.error('WS handler error', e); }
          });

          // Built-in handlers for notifications / detections
          if (data.type === 'alert' || data.type === 'weapon_alert') {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            if (data.type === 'weapon_alert') {
              queryClient.invalidateQueries({ queryKey: ['weaponDetections'] });
            }
            if (data.detectionId) {
              queryClient.invalidateQueries({ queryKey: ['detections'] });
            }
            const toastType = data.type === 'weapon_alert' ? 'error' : 'info';
            (toast as any)[toastType](data.title || 'New Alert', { description: data.message });
          }

          if (data.type === 'assignment_created') {
            queryClient.invalidateQueries({ queryKey: ['detections'] });
            toast.info('Officer Dispatched', {
              description: `Officer dispatched ${data.distanceKm ? `(${Number(data.distanceKm).toFixed(1)} km)` : ''} to ${data.plateNumber || 'detection'}`,
            });
          }

          if (data.type === 'assignment_updated') {
            queryClient.invalidateQueries({ queryKey: ['detections'] });
            toast.info('Assignment Updated', {
              description: `Detection status changed to ${data.status || 'updated'}`,
            });
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket Disconnected');
        setIsConnected(false);
        // Reconnect after 3 seconds if not intentionally cancelled
        if (!cancelled) {
          reconnectTimerRef.current = setTimeout(connect, 3000);
        }
      };

      socket.onerror = () => {
        // onclose fires after onerror, reconnect handled there
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [token, user, queryClient]);

  return (
    <SocketContext.Provider value={{ isConnected, subscribe }}>
      {children}
    </SocketContext.Provider>
  );
}
