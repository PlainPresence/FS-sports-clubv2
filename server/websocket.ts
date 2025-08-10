import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface WebSocketClient extends WebSocket {
  isAlive: boolean;
  subscriptions: Set<string>;
  userId?: string;
}

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

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

interface SlotData {
  timeSlot: string;
  isBooked: boolean;
  bookingId?: string;
  customerName?: string;
  isExpired?: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // topic -> clientIds
  private expirationTimers: Map<string, NodeJS.Timeout> = new Map(); // bookingId -> timer

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocketClient, req) => {
      const clientId = this.generateClientId();
      ws.isAlive = true;
      ws.subscriptions = new Set();
      this.clients.set(clientId, ws);

      console.log(`WebSocket client connected: ${clientId}`);

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleClientDisconnect(clientId);
      });

      // Handle ping/pong for connection health
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection_established',
        data: { clientId, message: 'Connected to SportsTurf Pro WebSocket' },
        timestamp: Date.now()
      });
    });

    // Set up heartbeat to detect dead connections
    setInterval(() => {
      this.wss.clients.forEach((ws: any) => {
        const wsClient = ws as WebSocketClient;
        if (wsClient.isAlive === false) {
          return wsClient.terminate();
        }
        wsClient.isAlive = false;
        wsClient.ping();
      });
    }, 30000);
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleMessage(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'auth':
        this.handleAuth(clientId, message.data);
        break;
      case 'subscribe_slots':
        this.handleSubscribeSlots(clientId, message.data);
        break;
      case 'unsubscribe_slots':
        this.handleUnsubscribeSlots(clientId, message.data);
        break;
      case 'refresh_slots':
        this.handleRefreshSlots(clientId, message.data);
        break;
      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong',
          data: { timestamp: Date.now() },
          timestamp: Date.now()
        });
        break;
      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  private handleAuth(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (client && data.token) {
      client.userId = data.userId || 'anonymous';
      console.log(`Client ${clientId} authenticated as ${client.userId}`);
    }
  }

  private handleSubscribeSlots(clientId: string, data: any) {
    const { date, sportType } = data;
    const topic = `slots_${date}_${sportType}`;
    
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.add(topic);
      
      if (!this.subscriptions.has(topic)) {
        this.subscriptions.set(topic, new Set());
      }
      this.subscriptions.get(topic)!.add(clientId);
      
      console.log(`Client ${clientId} subscribed to ${topic}`);
    }
  }

  private handleUnsubscribeSlots(clientId: string, data: any) {
    const { date, sportType } = data;
    const topic = `slots_${date}_${sportType}`;
    
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.delete(topic);
      
      const topicSubscribers = this.subscriptions.get(topic);
      if (topicSubscribers) {
        topicSubscribers.delete(clientId);
        if (topicSubscribers.size === 0) {
          this.subscriptions.delete(topic);
        }
      }
      
      console.log(`Client ${clientId} unsubscribed from ${topic}`);
    }
  }

  private handleRefreshSlots(clientId: string, data: any) {
    const { date, sportType } = data;
    console.log(`Refresh slots requested for ${date} ${sportType}`);
    // The actual refresh will be triggered by your API when it calls refreshSlots
  }

  private handleClientDisconnect(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      // Remove from all subscriptions
      client.subscriptions.forEach(topic => {
        const topicSubscribers = this.subscriptions.get(topic);
        if (topicSubscribers) {
          topicSubscribers.delete(clientId);
          if (topicSubscribers.size === 0) {
            this.subscriptions.delete(topic);
          }
        }
      });
    }
    
    this.clients.delete(clientId);
    console.log(`WebSocket client disconnected: ${clientId}`);
  }

  private sendToClient(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  // Public methods for broadcasting messages (called from your API routes)
  public broadcastToTopic(topic: string, message: WebSocketMessage) {
    const subscribers = this.subscriptions.get(topic);
    if (subscribers && subscribers.size > 0) {
      console.log(`Broadcasting to ${subscribers.size} clients on topic: ${topic}`);
      subscribers.forEach(clientId => {
        this.sendToClient(clientId, message);
      });
    } else {
      console.log(`No subscribers for topic: ${topic}`);
    }
  }

  public broadcastToAll(message: WebSocketMessage) {
    console.log(`Broadcasting to ${this.clients.size} clients`);
    this.clients.forEach((client, clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  public sendSlotUpdate(date: string, sportType: string, slots: SlotData[]) {
    const topic = `slots_${date}_${sportType}`;
    this.broadcastToTopic(topic, {
      type: 'slot_update',
      data: { 
        date, 
        sportType, 
        slots,
        action: 'update'
      },
      timestamp: Date.now()
    });
  }

  public sendBookingConfirmed(bookingData: BookingData) {
    console.log(`Broadcasting booking confirmed: ${bookingData.bookingId}`);
    
    // Broadcast to all clients for admin notifications
    this.broadcastToAll({
      type: 'booking_confirmed',
      data: bookingData,
      timestamp: Date.now()
    });

    // Also send slot update for the specific date/sport
    const topic = `slots_${bookingData.date}_${bookingData.sportType}`;
    this.broadcastToTopic(topic, {
      type: 'slot_update',
      data: {
        date: bookingData.date,
        sportType: bookingData.sportType,
        action: 'booked',
        timeSlots: bookingData.timeSlots,
        booking: bookingData
      },
      timestamp: Date.now()
    });
  }

  public sendSlotBlocked(date: string, sportType: string, blockedSlots: string[], reason?: string) {
    const topic = `slots_${date}_${sportType}`;
    this.broadcastToTopic(topic, {
      type: 'slot_blocked',
      data: { 
        date, 
        sportType, 
        blockedSlots, 
        reason: reason || 'Blocked by admin',
        action: 'blocked'
      },
      timestamp: Date.now()
    });
  }

  public sendSlotFreed(date: string, sportType: string, freedSlots: string[], booking?: BookingData) {
    const topic = `slots_${date}_${sportType}`;
    this.broadcastToTopic(topic, {
      type: 'slot_freed',
      data: {
        date,
        sportType,
        freedSlots,
        action: 'freed',
        booking
      },
      timestamp: Date.now()
    });
  }

  public sendBookingExpired(bookingData: BookingData) {
    console.log(`Broadcasting booking expired: ${bookingData.bookingId}`);
    
    // Broadcast to all for admin notifications
    this.broadcastToAll({
      type: 'booking_expired',
      data: bookingData,
      timestamp: Date.now()
    });

    // Free the slots
    this.sendSlotFreed(bookingData.date, bookingData.sportType, bookingData.timeSlots, bookingData);
  }

  public sendSystemMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    this.broadcastToAll({
      type: 'system_message',
      data: { message, level },
      timestamp: Date.now()
    });
  }

  // Method to refresh slots for a specific date/sport (called from API)
  public refreshSlots(date: string, sportType: string, slotsData: SlotData[]) {
    console.log(`Refreshing slots for ${date} ${sportType}`);
    this.sendSlotUpdate(date, sportType, slotsData);
  }

  // Method to schedule booking expiration (called from API when booking is created)
  public scheduleBookingExpiration(bookingData: BookingData) {
    // Clear existing timer if any
    const existingTimer = this.expirationTimers.get(bookingData.bookingId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const expirationTime = new Date(bookingData.expiresAt).getTime() - Date.now();
    
    if (expirationTime > 0) {
      console.log(`Scheduling expiration for booking ${bookingData.bookingId} in ${expirationTime}ms`);
      
      const timer = setTimeout(() => {
        console.log(`Booking ${bookingData.bookingId} expired`);
        
        // Notify that booking expired
        this.sendBookingExpired(bookingData);
        this.expirationTimers.delete(bookingData.bookingId);
        
        // Note: The actual database update should be handled by your API
        // You can make an HTTP request here or emit an event to your main application
      }, expirationTime);
      
      this.expirationTimers.set(bookingData.bookingId, timer);
    }
  }

  // Method to cancel booking expiration (called when booking is confirmed)
  public cancelBookingExpiration(bookingId: string) {
    const timer = this.expirationTimers.get(bookingId);
    if (timer) {
      clearTimeout(timer);
      this.expirationTimers.delete(bookingId);
      console.log(`Cancelled expiration timer for booking ${bookingId}`);
    }
  }

  public getStats() {
    return {
      connectedClients: this.clients.size,
      activeSubscriptions: this.subscriptions.size,
      topics: Array.from(this.subscriptions.keys()),
      expirationTimers: this.expirationTimers.size
    };
  }

  // Cleanup method
  public cleanup() {
    // Clear all expiration timers
    this.expirationTimers.forEach(timer => clearTimeout(timer));
    this.expirationTimers.clear();
    
    // Close all WebSocket connections
    this.clients.forEach(client => client.close());
    this.clients.clear();
    
    this.wss.close();
  }
}

export default WebSocketManager;
