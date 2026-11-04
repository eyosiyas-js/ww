import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { authStorage } from '@/lib/auth';
import { API_BASE_URL } from '@/api/config';

export function useNotifications() {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token) return;

    // Convert API_BASE_URL to WS URL
    // e.g. http://localhost:8000/api/v1 -> ws://localhost:8000/api/v1
    const wsBaseUrl = API_BASE_URL.replace(/^http/, 'ws');
    const wsUrl = `${wsBaseUrl}/notifications/ws?token=${token}`;

    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[Notifications] WebSocket Connected');
        };

        ws.onmessage = (event) => {
          if (event.data === 'pong') return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'detection_alert') {
              toast.error(data.title, {
                description: data.message,
                duration: 10000,
                action: {
                  label: 'View Camera',
                  onClick: () => window.location.href = data.actionUrl || '/cameras'
                }
              });
            } else {
              toast.info(data.title, { description: data.message });
            }
          } catch (e) {
            console.error('Failed to parse notification message', e);
          }
        };

        ws.onclose = () => {
          console.log('[Notifications] WebSocket Disconnected. Reconnecting...');
          setTimeout(connect, 3000); // Reconnect after 3s
        };

        // Keep-alive ping
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);

        return () => {
          clearInterval(pingInterval);
          ws.close();
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
      }
    };

    const cleanup = connect();
    return cleanup;
  }, []);

  return null;
}
