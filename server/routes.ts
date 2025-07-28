import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import WebSocketManager from "./websocket";
import crypto from "crypto";
// @ts-ignore: No type declarations for firebase-admin in this environment
import admin from 'firebase-admin';
import axios from 'axios';

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
    const { orderId, amount, customerDetails } = req.body;
    try {
      const response = await axios.post(
        'https://sandbox.cashfree.com/pg/orders',
        {
          order_id: orderId,
          order_amount: amount,
          order_currency: 'INR',
          customer_details: customerDetails,
        },
        {
          headers: {
            'x-client-id': process.env.CASHFREE_CLIENT_ID,
            'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
            'Content-Type': 'application/json',
          },
        }
      );
      res.json({ paymentSessionId: response.data.payment_session_id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create Cashfree session', details: error.message });
    }
  });

  // TODO: Add Cashfree webhook endpoint for payment status updates

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
