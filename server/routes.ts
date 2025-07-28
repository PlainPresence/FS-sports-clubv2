import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import WebSocketManager from "./websocket";
import Razorpay from "razorpay";
import crypto from "crypto";
// @ts-ignore: No type declarations for firebase-admin in this environment
import admin from 'firebase-admin';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_SECRET_KEY!,
});

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

  // Create Razorpay order
  app.post('/api/create-order', async (req, res) => {
    const { amount, currency = "INR", receipt } = req.body;
    try {
      const order = await razorpay.orders.create({
        amount, // amount in paise
        currency,
        receipt,
        payment_capture: 1,
      });
      res.json(order);
    } catch (err) {
      res.status(500).json({ error: "Order creation failed", details: err });
    }
  });

  // Verify Razorpay payment signature
  app.post('/api/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET_KEY!);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');
    if (generated_signature === razorpay_signature) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
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
      // 4. Create booking for each slot
      const batch = firestore.batch();
      for (const slot of timeSlots) {
        const bookingRef = firestore.collection('bookings').doc();
        batch.set(bookingRef, {
          ...bookingData,
          timeSlot: slot,
          sportType,
          date,
          paymentStatus: 'success',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
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
