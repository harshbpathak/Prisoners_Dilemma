import { useCallback, useEffect, useRef } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const useWebSocket = (onMessage) => {
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  // Use a ref for the callback to avoid reconnections when callback changes
  const onMessageRef = useRef(onMessage);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    ws.current = new WebSocket(`${wsUrl}/api/ws`);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Use the ref to call the latest callback
        onMessageRef.current(data);
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, []); // No dependencies - connect function is stable

  useEffect(() => {
    connect();

    const pingInterval = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send('ping');
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) ws.current.close();
    };
  }, [connect]);

  return ws;
};
export default useWebSocket;