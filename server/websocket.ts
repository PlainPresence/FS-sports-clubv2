import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { db } from './firebase'; // Assume you have Firebase admin initialized
import { collection, query, where, onSnapshot, Timestamp, doc, updateDoc } from 'firebase/firestore';

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
  createdAt: Timestamp;
  customerDetails: {
    customer_email: string;
    customer_id: string;
    customer_name: string;
    customer_phone: string;
  };
  date: string;
  email: string | null;
  expiresAt: Timestamp;
  fullName: string;
  mobile: string;
  paymentStatus: string;
  speedMeter: boolean;
  speedMeterPrice: number;
  sportType: string;
  status: string;
  timeSlots: string[];
  updatedAt: Timestamp;
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
  private firebaseListeners: Map<string, () => void> = new Map(); // topic -> unsubscribe function
  private expirationTimers: Map<string, NodeJS.Timeout> = new Map(); // bookingId -> timer

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
    this.startExpirationChecker();
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
    }, 30000); // Check every 30 seconds
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
      // In a real app, you'd verify the token here
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
        this.setupFirebaseListener(date, sportType);
      }
      this.subscriptions.get(topic)!.add(clientId);
      
      console.log(`Client ${clientId} subscribed to ${topic}`);
      
      // Send current slot data immediately
      this.sendCurrentSlotData(date, sportType);
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
          this.removeFirebaseListener(topic);
        }
      }
      
      console.log(`Client ${clientId} unsubscribed from ${topic}`);
    }
  }

  private handleRefreshSlots(clientId: string, data: any) {
    const { date, sportType } = data;
    this.sendCurrentSlotData(date, sportType);
  }

  private setupFirebaseListener(date: string, sportType: string) {
    const topic = `slots_${date}_${sportType}`;
    
    // Query for bookings on this date and sport type
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('date', '==', date),
      where('sportType', '==', sportType)
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      console.log(`Firebase update for ${topic}, ${snapshot.docs.length} bookings`);
      
      const bookings: BookingData[] = [];
      snapshot.docChanges().forEach((change) => {
        const booking = change.doc.data() as BookingData;
        
        if (change.type === 'added' || change.type === 'modified') {
          bookings.push(booking);
          
          // Handle booking expiration
          if (booking.expiresAt && booking.status !== 'confirmed') {
            this.scheduleBookingExpiration(booking);
          }
          
          // Broadcast booking events
          if (change.type === 'added' && booking.status === 'confirmed') {
            this.sendBookingConfirmed(booking);
          }
        }
        
        if (change.type === 'removed') {
          this.sendSlotFreed(date, sportType, booking.timeSlots, booking);
        }
      });
      
      // Generate and send slot update
      this.generateAndSendSlotUpdate(date, sportType, snapshot.docs.map(doc => doc.data() as BookingData));
    }, (error) => {
      console.error(`Error in Firebase listener for ${topic}:`, error);
    });

    this.firebaseListeners.set(topic, unsubscribe);
  }

  private removeFirebaseListener(topic: string) {
    const unsubscribe = this.firebaseListeners.get(topic);
    if (unsubscribe) {
      unsubscribe();
      this.firebaseListeners.delete(topic);
      console.log(`Removed Firebase listener for ${topic}`);
    }
  }

  private async sendCurrentSlotData(date: string, sportType: string) {
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('date', '==', date),
        where('sportType', '==', sportType)
      );
      
      // This would need to be implemented with your Firebase method
      // For now, just trigger the listener which will send the data
    } catch (error) {
      console.error('Error fetching current slot data:', error);
    }
  }

  private generateAndSendSlotUpdate(date: string, sportType: string, bookings: BookingData[]) {
    const slots: SlotData[] = [];
    const bookedSlots = new Set<string>();
    
    // Process all confirmed bookings
    bookings.forEach(booking => {
      if (booking.status === 'confirmed' && booking.paymentStatus === 'success') {
        booking.timeSlots.forEach(timeSlot => {
          bookedSlots.add(timeSlot);
          slots.push({
            timeSlot,
            isBooked: true,
            bookingId: booking.bookingId,
            customerName: booking.customerDetails.customer_name || booking.fullName,
            isExpired: false
          });
        });
      }
    });

    // Send slot update
    this.sendSlotUpdate(date, sportType, slots);
  }

  private scheduleBookingExpiration(booking: BookingData) {
    // Clear existing timer if any
    const existingTimer = this.expirationTimers.get(booking.bookingId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const expirationTime = booking.expiresAt.toDate().getTime() - Date.now();
    
    if (expirationTime > 0) {
      const timer = setTimeout(async () => {
        try {
          // Update booking status to expired
          await updateDoc(doc(db, 'bookings', booking.bookingId), {
            status: 'expired',
            updatedAt: Timestamp.now()
          });
          
          // Broadcast expiration
          this.sendBookingExpired(booking);
          this.expirationTimers.delete(booking.bookingId);
        } catch (error) {
          console.error('Error expiring booking:', error);
        }
      }, expirationTime);
      
      this.expirationTimers.set(booking.bookingId, timer);
    }
  }

  private startExpirationChecker() {
    // Check for expired bookings every 5 minutes
    setInterval(async () => {
      try {
        const now = Timestamp.now();
        const expiredQuery = query(
          collection(db, 'bookings'),
          where('expiresAt', '<', now),
          where('status', '!=', 'confirmed'),
          where('status', '!=', 'expired')
        );
        
        // This would need proper implementation with your Firebase setup
        console.log('Checking for expired bookings...');
      } catch (error) {
        console.error('Error in expiration checker:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
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
            this.removeFirebaseListener(topic);
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

  // Public methods for broadcasting messages
  public broadcastToTopic(topic: string, message: WebSocketMessage) {
    const subscribers = this.subscriptions.get(topic);
    if (subscribers) {
      subscribers.forEach(clientId => {
        this.sendToClient(clientId, message);
      });
    }
  }

  public broadcastToAll(message: WebSocketMessage) {
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

  public getStats() {
    return {
      connectedClients: this.clients.size,
      activeSubscriptions: this.subscriptions.size,
      topics: Array.from(this.subscriptions.keys()),
      firebaseListeners: this.firebaseListeners.size,
      expirationTimers: this.expirationTimers.size
    };
  }

  // Cleanup method
  public cleanup() {
    // Clear all Firebase listeners
    this.firebaseListeners.forEach(unsubscribe => unsubscribe());
    this.firebaseListeners.clear();
    
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
