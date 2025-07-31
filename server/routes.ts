import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import WebSocketManager from "./websocket";
import crypto from "crypto";
// @ts-ignore: No type declarations for firebase-admin in this environment
import admin from 'firebase-admin';
import axios from 'axios';
import type { Request, Response } from 'express';

// Export the webhook handler for use in index.ts
export const cashfreeWebhookHandler = async (req: Request, res: Response) => {
  try {
    // Use the raw body (Buffer) for signature verification
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const clientSecret = process.env.CASHFREE_CLIENT_SECRET; // Use client secret, not webhook secret
    const payload = req.body as Buffer; // Buffer
    
    // Check if client secret is configured
    if (!clientSecret) {
      console.error('CASHFREE_CLIENT_SECRET not configured');
      return res.status(500).json({ error: 'Client secret not configured' });
    }
    
    // Check if required headers are present
    if (!signature || !timestamp) {
      console.error('Missing webhook headers: signature or timestamp');
      return res.status(401).json({ error: 'Missing webhook headers' });
    }
    
    // Generate signature: Base64Encode(HMACSHA256(timestamp + payload, clientSecret))
    const dataToSign = timestamp + payload.toString('utf8');
    const expectedSignature = crypto.createHmac('sha256', clientSecret).update(dataToSign).digest('base64');
    
    if (signature !== expectedSignature) {
      console.error('Invalid Cashfree webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Parse the raw body as JSON for business logic
    const event = JSON.parse(payload.toString('utf8'));
    console.log('Webhook event received:', JSON.stringify(event, null, 2));
    
    // Check for both event types: PAYMENT_SUCCESS and PAYMENT_SUCCESS_WEBHOOK
    if ((event.event && event.event === 'PAYMENT_SUCCESS') || 
        (event.type && event.type === 'PAYMENT_SUCCESS_WEBHOOK')) {
      console.log('Processing PAYMENT_SUCCESS event');
      const payment = event.data && event.data.payment;
      const order = event.data && event.data.order;
      
      console.log('Payment data:', payment);
      console.log('Order data:', order);
      
      if (!payment || !order) {
        console.error('Invalid webhook payload', event);
        return res.status(400).json({ error: 'Invalid webhook payload' });
      }
      
      // Check if booking already exists for this orderId
      console.log('Checking for existing booking with orderId:', order.order_id);
      const existing = await firestore.collection('bookings').where('cashfreeOrderId', '==', order.order_id).get();
      if (!existing.empty) {
        console.log('Booking already exists for orderId:', order.order_id);
        return res.status(200).json({ message: 'Booking already exists' });
      }
      
      // Create booking in Firestore
      console.log('Creating new booking in Firebase');
      const slotInfo = order.order_meta?.notes || {};
      const bookingData = {
        cashfreeOrderId: order.order_id,
        cashfreePaymentId: payment.cf_payment_id || payment.payment_id,
        cashfreePaymentStatus: payment.payment_status,
        fullName: order.customer_details?.customer_name || event.data.customer_details?.customer_name,
        mobile: order.customer_details?.customer_phone || event.data.customer_details?.customer_phone,
        email: order.customer_details?.customer_email || event.data.customer_details?.customer_email,
        amount: order.order_amount,
        paymentStatus: 'success',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        ...slotInfo // Merge slot/time/sport info into booking
      };
      
      console.log('Booking data to save:', bookingData);
      await firestore.collection('bookings').add(bookingData);
      console.log('Booking created successfully in Firebase');
      
      return res.status(200).json({ message: 'Booking created' });
    } else {
      console.log('Event ignored:', event.event || event.type);
    }
    return res.status(200).json({ message: 'Event ignored' });
  } catch (error) {
    console.error('Cashfree webhook error:', error, req.body);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
  }
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
  });
}
const firestore = admin.firestore();

// Cashfree API URL selection based on environment
const cashfreeApiUrl = process.env.NODE_ENV === 'production'
  ? 'https://api.cashfree.com/pg/orders'
  : 'https://sandbox.cashfree.com/pg/orders';

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  // Initialize WebSocket manager
  const wsManager = new WebSocketManager(httpServer);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // WebSocket stats endpoint
  app.get('/api/ws/stats', (req, res) => {
    res.json(wsManager.getStats());
  });

  // Add WebSocket manager to app for use in other parts
  app.set('wsManager', wsManager);

  // Cashfree: Create payment session endpoint
  app.post('/api/cashfree/create-session', async (req, res) => {
    const { orderId, amount, customerDetails, slotInfo } = req.body;
    // Check for required env variables
    if (!process.env.CASHFREE_CLIENT_ID || !process.env.CASHFREE_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Cashfree credentials not set in environment.' });
    }
    try {
      const response = await axios.post(
        cashfreeApiUrl,
        {
          order_id: orderId,
          order_amount: amount,
          order_currency: 'INR',
          customer_details: customerDetails,
          order_meta: {
            return_url: `https://fs-sports-clubv2.onrender.com/payment-confirmation?orderId=${orderId}`,
            notes: slotInfo // Pass slot/time/sport info here
          }
        },
        {
          headers: {
            'x-client-id': process.env.CASHFREE_CLIENT_ID,
            'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
            'Content-Type': 'application/json',
            'x-api-version': '2025-01-01', // Required for Cashfree 2025
          },
        }
      );
      res.json({ paymentSessionId: response.data.payment_session_id });
    } catch (error: any) {
      console.error('Cashfree session creation error:', error?.response?.data || error.message, error);
      res.status(500).json({ error: 'Failed to create payment session', details: error?.response?.data || error.message });
    }
  });

  // API endpoint to fetch booking by cashfreeOrderId
  app.get('/api/booking/by-cashfree-order', async (req, res) => {
    const { orderId } = req.query;
    if (!orderId) return res.status(400).json({ success: false, error: 'Missing orderId' });
    try {
      const snapshot = await firestore.collection('bookings').where('cashfreeOrderId', '==', orderId).limit(1).get();
      if (snapshot.empty) return res.status(404).json({ success: false, error: 'Booking not found' });
      const booking = snapshot.docs[0].data();
      return res.json({ success: true, booking });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Failed to fetch booking' });
    }
  });

  // Book slot endpoint (best practice)
  app.post('/api/book-slot', async (req, res) => {
    const wsManager = app.get('wsManager');
    const {
      date,
      sportType,
      timeSlots,
      bookingData
    } = req.body;
    if (!date || !sportType || !Array.isArray(timeSlots) || !bookingData) {
      return res.status(400).json({ error: 'Missing required booking data.' });
    }
    try {
      // Uniqueness check: prevent duplicate bookingId
      const existingBooking = await firestore.collection('bookings')
        .where('bookingId', '==', bookingData.bookingId)
        .get();
      if (!existingBooking.empty) {
        return res.status(409).json({ error: 'Duplicate bookingId. This booking already exists.' });
      }
      // 1. Check for already booked slots
      const bookingsQuery = firestore.collection('bookings')
        .where('date', '==', date)
        .where('sportType', '==', sportType)
        .where('paymentStatus', '==', 'success');
      const bookingsSnapshot = await bookingsQuery.get();
      const bookedSlots = bookingsSnapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data().timeSlot);
      for (const slot of timeSlots) {
        if (bookedSlots.includes(slot)) {
          return res.status(409).json({ error: `Slot ${slot} already booked.` });
        }
      }
      // 2. Check for blocked slots
      const blockedSlotsQuery = firestore.collection('blockedSlots')
        .where('date', '==', date)
        .where('sportType', '==', sportType);
      const blockedSlotsSnapshot = await blockedSlotsQuery.get();
      const blockedSlots = blockedSlotsSnapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data().timeSlot);
      for (const slot of timeSlots) {
        if (blockedSlots.includes(slot)) {
          return res.status(409).json({ error: `Slot ${slot} is blocked.` });
        }
      }
      // 3. Check for blocked date
      const blockedDatesQuery = firestore.collection('blockedDates')
        .where('date', '==', date);
      const blockedDatesSnapshot = await blockedDatesQuery.get();
      if (!blockedDatesSnapshot.empty) {
        return res.status(409).json({ error: 'This date is completely blocked.' });
      }
      // 4. Create a single booking document for all slots
      const bookingRef = firestore.collection('bookings').doc();
      await bookingRef.set({
        ...bookingData,
        timeSlots, // store the array of slots
        sportType,
        date,
        paymentStatus: 'success',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      // 5. Broadcast slot update
      if (wsManager && wsManager.sendSlotUpdate) {
        // Fetch updated slots for this date/sportType
        const updatedBookingsSnapshot = await firestore.collection('bookings')
          .where('date', '==', date)
          .where('sportType', '==', sportType)
          .where('paymentStatus', '==', 'success').get();
        const updatedBookedSlots = updatedBookingsSnapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data().timeSlot);
        wsManager.sendSlotUpdate(date, sportType, updatedBookedSlots);
      }
      res.json({ success: true });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ error: 'Booking failed', details: error.message });
    }
  });

  return httpServer;
}
