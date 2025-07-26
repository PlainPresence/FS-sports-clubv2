import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: 'slot_update' | 'booking_confirmed' | 'slot_blocked' | 'system_message';
  data: any;
  timestamp: number;
}

interface UseWebSocketOptions {
  onSlotUpdate?: (data: any) => void;
  onBookingConfirmed?: (data: any) => void;
  onSlotBlocked?: (data: any) => void;
  onSystemMessage?: (data: any) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    onSlotUpdate,
    onBookingConfirmed,
    onSlotBlocked,
    onSystemMessage,
    autoReconnect = true,
    reconnectInterval = 5000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Use secure WebSocket in production, regular in development
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host || 'localhost:5000';
      const wsUrl = `${protocol}//${host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        
        // Send authentication if needed
        if (localStorage.getItem('authToken')) {
          ws.send(JSON.stringify({
            type: 'auth',
            token: localStorage.getItem('authToken')
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Handle different message types
          switch (message.type) {
            case 'slot_update':
              onSlotUpdate?.(message.data);
              break;
            case 'booking_confirmed':
              onBookingConfirmed?.(message.data);
              toast({
                title: 'Booking Update',
                description: 'A new booking has been confirmed.',
              });
              break;
            case 'slot_blocked':
              onSlotBlocked?.(message.data);
              toast({
                title: 'Slot Blocked',
                description: 'A time slot has been blocked by admin.',
                variant: 'destructive',
              });
              break;
            case 'system_message':
              onSystemMessage?.(message.data);
              toast({
                title: 'System Message',
                description: message.data.message,
              });
              break;
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        
        if (autoReconnect && event.code !== 1000) {
          setConnectionError('Connection lost. Reconnecting...');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error occurred');
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionError('Failed to establish connection');
      setIsConnecting(false);
    }
  }, [autoReconnect, reconnectInterval, onSlotUpdate, onBookingConfirmed, onSlotBlocked, onSystemMessage, toast]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setConnectionError(null);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const subscribeToSlots = useCallback((date: string, sportType: string) => {
    sendMessage({
      type: 'subscribe_slots',
      data: { date, sportType }
    });
  }, [sendMessage]);

  const unsubscribeFromSlots = useCallback((date: string, sportType: string) => {
    sendMessage({
      type: 'unsubscribe_slots',
      data: { date, sportType }
    });
  }, [sendMessage]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    lastMessage,
    connectionError,
    connect,
    disconnect,
    sendMessage,
    subscribeToSlots,
    unsubscribeFromSlots
  };
}; 
