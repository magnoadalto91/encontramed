import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { WS_URL } from '../utils/constants';
import { notificacaoStore } from '../store/notificacaoStore';

export default function useWebSocket(onMessage) {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const mounted = useRef(true);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(async () => {
    if (!mounted.current) return;
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;

      const socket = new WebSocket(WS_URL);
      ws.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'auth', token }));
      };

      socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'notificacao') {
            notificacaoStore.getState().incrementCount();
          }
          onMessageRef.current?.(data);
        } catch {}
      };

      socket.onclose = () => {
        if (!mounted.current) return;
        reconnectTimer.current = setTimeout(connect, 5000);
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch {}
  }, []);

  useEffect(() => {
    connect();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
          connect();
        }
      }
    });
    return () => {
      mounted.current = false;
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
      sub.remove();
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
