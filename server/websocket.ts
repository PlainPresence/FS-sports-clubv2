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

class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // topic -> clientIds

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
      this.wss.clients.forEach((ws: WebSocketClient) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
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

  public sendSlotUpdate(date: string, sportType: string, slots: any[]) {
    const topic = `slots_${date}_${sportType}`;
    this.broadcastToTopic(topic, {
      type: 'slot_update',
      data: { date, sportType, slots },
      timestamp: Date.now()
    });
  }

  public sendBookingConfirmed(bookingData: any) {
    this.broadcastToAll({
      type: 'booking_confirmed',
      data: bookingData,
      timestamp: Date.now()
    });
  }

  public sendSlotBlocked(date: string, sportType: string, blockedSlots: string[]) {
    const topic = `slots_${date}_${sportType}`;
    this.broadcastToTopic(topic, {
      type: 'slot_blocked',
      data: { date, sportType, blockedSlots },
      timestamp: Date.now()
    });
  }

  public getStats() {
    return {
      connectedClients: this.clients.size,
      activeSubscriptions: this.subscriptions.size,
      topics: Array.from(this.subscriptions.keys())
    };
  }
}

export default WebSocketManager; 
