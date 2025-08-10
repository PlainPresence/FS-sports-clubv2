import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface BookingData {
  amount: number;
  bookingId: string;
  bookingType: string;
  cashfreeOrderId: string | null;
  cashfreePaymentId: string | null;
  cashfreePaymentStatus: string | null;
  createdAt: Date;
  customerDetails: {
    customer_email: string;
    customer_id: string;
    customer_name: string;
    customer_phone: string;
  };
  date: string;
  email: string | null;
  expiresAt: Date;
  fullName: string;
  mobile: string;
  paymentStatus: string;
  speedMeter: boolean;
  speedMeterPrice: number;
  sportType: string;
  status: string;
  timeSlots: string[];
  updatedAt: Date;
}

interface SlotUpdateData {
  date: string;
  sportType: string;
  timeSlot: string;
  action: 'booked' | 'freed' | 'blocked' | 'expired';
  booking?: BookingData;
}

interface WebSocketMessage {
  type: 'slot_update' | 'booking_confirmed' | 'slot_blocked' | 'slot_freed' | 'booking_expired' | 'system_message';
  data: any;
  timestamp: number;
}

interface UseWebSocketOptions {
  onSlotUpdate?: (data: SlotUpdateData) => void;
  onBookingConfirmed?: (data: BookingData) => void;
  onSlotBlocked?: (data: any) => void;
  onSlotFreed?: (data: any) => void;
  onBookingExpired?: (data: BookingData) => void;
  onSystemMessage?: (data: any) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    onSlotUpdate,
    onBookingConfirmed,
    onSlotBlocked,
    onSlotFreed,
    onBookingExpired,
    onSystemMessage,
    autoReconnect = true,
    reconnectInterval = 10000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
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
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          ws.send(JSON.stringify({
            type: 'auth',
            token: authToken
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
                title: 'New Booking',
                description: `Booking confirmed for ${message.data.customerDetails?.customer_name || message.data.fullName}`,
              });
              break;
              
            case 'slot_blocked':
              onSlotBlocked?.(message.data);
              toast({
                title: 'Slot Blocked',
                description: `Time slot ${message.data.timeSlot} has been blocked by admin.`,
                variant: 'destructive',
              });
              break;
              
            case 'slot_freed':
              onSlotFreed?.(message.data);
              toast({
                title: 'Slot Available',
                description: `Time slot ${message.data.timeSlot} is now available.`,
              });
              break;
              
            case 'booking_expired':
              onBookingExpired?.(message.data);
              toast({
                title: 'Booking Expired',
                description: `Booking ${message.data.bookingId} has expired and slot is now available.`,
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
  }, [autoReconnect, reconnectInterval, onSlotUpdate, onBookingConfirmed, onSlotBlocked, onSlotFreed, onBookingExpired, onSystemMessage, toast]);

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
      wsRef.current.send(JSON.stringify({
        ...message,
        timestamp: Date.now()
      }));
      return true;
    }
    console.warn('WebSocket not connected, message not sent:', message);
    return false;
  }, []);

  const subscribeToSlots = useCallback((date: string, sportType: string) => {
    const success = sendMessage({
      type: 'subscribe_slots',
      data: { date, sportType }
    });
    
    if (success) {
      console.log(`Subscribed to slots for ${sportType} on ${date}`);
    }
    
    return success;
  }, [sendMessage]);

  const unsubscribeFromSlots = useCallback((date: string, sportType: string) => {
    const success = sendMessage({
      type: 'unsubscribe_slots',
      data: { date, sportType }
    });
    
    if (success) {
      console.log(`Unsubscribed from slots for ${sportType} on ${date}`);
    }
    
    return success;
  }, [sendMessage]);

  const refreshSlots = useCallback((date: string, sportType: string) => {
    return sendMessage({
      type: 'refresh_slots',
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

  // Add ping/pong for connection health
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [isConnected, sendMessage]);

  return {
    isConnected,
    isConnecting,
    lastMessage,
    connectionError,
    connect,
    disconnect,
    sendMessage,
    subscribeToSlots,
    unsubscribeFromSlots,
    refreshSlots
  };
};
