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
    // Helper to normalize a time slot string to 'hh:mm AM/PM - hh:mm AM/PM'
    function normalizeTimeSlot(slot: string): string {
      // Already in correct format
      if (/AM|PM|am|pm/.test(slot)) return slot;
      // Convert 'HH:mm-HH:mm' to 'hh:mm AM/PM - hh:mm AM/PM'
      const [start, end] = slot.split('-');
      function to12h(t: string): string {
        const [hStr, m] = t.split(':');
        let hNum = parseInt(hStr, 10);
        const ampm = hNum >= 12 ? 'PM' : 'AM';
        hNum = hNum % 12;
        if (hNum === 0) hNum = 12;
        return `${hNum.toString().padStart(2, '0')}:${m} ${ampm}`;
      }
      if (start && end) return `${to12h(start)} - ${to12h(end)}`;
      return slot;
    }
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

      // Defensive extraction of slot info
      let slotInfo = order.order_meta?.notes || {};
      let finalSlotInfo = slotInfo;
      console.log('Slot info from order_meta.notes:', slotInfo);
      if (!slotInfo.date || !slotInfo.timeSlots || !slotInfo.sportType) {
        try {
          const tempBookingDoc = await firestore.collection('tempBookings').doc(order.order_id).get();
          if (tempBookingDoc.exists) {
            const tempData = tempBookingDoc.data();
            console.log('Found tempBookingDoc:', tempData);
            finalSlotInfo = {
              date: tempData?.date || new Date().toISOString().split('T')[0],
              timeSlots: tempData?.timeSlots || ['10:00-11:00'],
              sportType: tempData?.sportType || 'cricket',
              bookingId: order.order_id,
              ...tempData
            };
            await firestore.collection('tempBookings').doc(order.order_id).delete();
          } else {
            console.error('No tempBookingDoc found for order_id:', order.order_id);
            finalSlotInfo = {
              date: null,
              timeSlots: null,
              sportType: null,
              bookingId: order.order_id,
            };
          }
        } catch (error) {
          console.error('Error fetching tempBookingDoc:', error);
          finalSlotInfo = {
            date: null,
            timeSlots: null,
            sportType: null,
            bookingId: order.order_id,
          };
        }
      }
      // Defensive: If still missing, abort with error
      if (!finalSlotInfo.date || !finalSlotInfo.sportType || !finalSlotInfo.timeSlots) {
        console.error('Missing date, sportType, or timeSlots for booking creation', finalSlotInfo);
        return res.status(400).json({ error: 'Missing date, sportType, or timeSlots for booking creation', details: finalSlotInfo });
      }
      // Check if booking already exists for this orderId (inside transaction)
      let bookingData: any = null;
      await firestore.runTransaction(async (transaction) => {
        const existing = await transaction.get(
          firestore.collection('bookings').where('cashfreeOrderId', '==', order.order_id)
        );
        if (!existing.empty) {
          console.log('Booking already exists for orderId:', order.order_id);
          return; // Exit transaction, do not create duplicate
        }
        // Check for double booking - prevent booking the same slots
        console.log('Checking for double booking...');
        const timeSlotsArr: string[] = Array.isArray(finalSlotInfo.timeSlots) ? finalSlotInfo.timeSlots : [finalSlotInfo.timeSlots];
        // Normalize all time slots for this booking
        const normalizedTimeSlotsArr: string[] = timeSlotsArr.map(normalizeTimeSlot);
        
        // Don't check for double booking if this is a tournament booking
        if (finalSlotInfo.tournamentId || finalSlotInfo.bookingType === 'tournament') {
          console.log('Skipping double booking check for tournament booking');
          
          // Update tournament slots
          try {
            // Get tournament reference and check slots
            const tournamentQuery = await transaction.get(
              firestore.collection("tournaments").doc(finalSlotInfo.tournamentId)
            );
            
            if (!tournamentQuery.exists) {
              throw new Error('Tournament not found');
            }
            
            const tournamentData = tournamentQuery.data();
            const currentSlots = tournamentData?.remainingSlots || 0;
            
            if (currentSlots > 0) {
              // Decrement remaining slots
              transaction.update(tournamentQuery.ref, {
                remainingSlots: currentSlots - 1,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              console.log(`Updated tournament slots. New remaining slots: ${currentSlots - 1}`);
            } else {
              throw new Error('No slots available for this tournament');
            }
          } catch (error) {
            console.error('Error updating tournament slots:', error);
            throw error;
          }
        } else {
          // Regular booking - check for conflicts
          console.log('Checking for double booking on date:', finalSlotInfo.date, 'with slots:', normalizedTimeSlotsArr);
          const existingBookings = await transaction.get(
            firestore.collection('bookings')
              .where('date', '==', finalSlotInfo.date)
              .where('sportType', '==', finalSlotInfo.sportType)
              .where('paymentStatus', '==', 'success')
              .where('bookingType', '==', 'regular') // Only check conflicts with regular bookings
          );
          const bookedSlots: string[] = existingBookings.docs.flatMap(doc => {
            const data = doc.data();
            console.log('Existing booking date:', data.date, 'slots:', data.timeSlots);
            const slots: string[] = Array.isArray(data.timeSlots) ? data.timeSlots : [data.timeSlot || data.timeSlots];
            return slots.map(normalizeTimeSlot);
          });
          const conflictingSlots: string[] = normalizedTimeSlotsArr.filter((slot: string) => bookedSlots.includes(slot));
          if (conflictingSlots.length > 0) {
            console.log('Double booking detected for slots:', conflictingSlots, 'on date:', finalSlotInfo.date);
            throw new Error('Slots already booked: ' + conflictingSlots.join(', '));
          }
        }
        // Ensure we have minimum required data for booking
        const isTournamentBooking = Boolean(finalSlotInfo.tournamentId || finalSlotInfo.bookingType === 'tournament');
        bookingData = {
          cashfreeOrderId: order.order_id,
          cashfreePaymentId: payment.cf_payment_id || payment.payment_id,
          cashfreePaymentStatus: payment.payment_status,
          fullName: finalSlotInfo.captainName || order.customer_details?.customer_name || event.data.customer_details?.customer_name,
          mobile: order.customer_details?.customer_phone || event.data.customer_details?.customer_phone,
          email: order.customer_details?.customer_email || event.data.customer_details?.customer_email,
          amount: order.order_amount,
          paymentStatus: 'success',
          status: 'confirmed',
          bookingType: isTournamentBooking ? 'tournament' : 'regular',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          
          // Base properties
          date: finalSlotInfo.date,
          sportType: finalSlotInfo.sportType,
          timeSlots: isTournamentBooking ? ['Tournament'] : normalizedTimeSlotsArr,
          
          // Tournament-specific fields
          ...(isTournamentBooking ? {
            tournamentId: finalSlotInfo.tournamentId,
            tournamentName: finalSlotInfo.tournamentName || 'Tournament',
            tournamentBookingId: order.order_id,
            teamName: finalSlotInfo.teamName,
            captainName: finalSlotInfo.captainName,
            teamMembers: finalSlotInfo.teamMembers || [],
            captainMobile: finalSlotInfo.captainMobile || order.customer_details?.customer_phone,
            captainEmail: finalSlotInfo.captainEmail || order.customer_details?.customer_email
          } : {})
        };
        console.log('Booking data to save:', bookingData);
        const bookingRef = firestore.collection('bookings').doc();
        transaction.set(bookingRef, bookingData);

        // Update slot availability in real-time inside the transaction
        if (bookingData.date && bookingData.timeSlots && bookingData.sportType) {
          const timeSlots = Array.isArray(bookingData.timeSlots) ? bookingData.timeSlots : [bookingData.timeSlots];
          for (const timeSlot of timeSlots) {
            const slotAvailabilityRef = firestore.collection('slotAvailability').doc();
            transaction.set(slotAvailabilityRef, {
              date: bookingData.date,
              sportType: bookingData.sportType,
              timeSlot: timeSlot,
              status: 'booked',
              bookingId: bookingData.bookingId || bookingData.cashfreeOrderId,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      });
      console.log('Booking created successfully in Firebase (transaction)');
      
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
      // Store booking data temporarily for webhook retrieval
      if (slotInfo) {
        await firestore.collection('tempBookings').doc(orderId).set({
          ...slotInfo,
          amount,
          customerDetails,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes expiry
        });
        console.log('Stored temporary booking data for orderId:', orderId);
      }
      
      const response = await axios.post(
        cashfreeApiUrl,
        {
          order_id: orderId,
          order_amount: amount,
          order_currency: 'INR',
          customer_details: customerDetails,
          order_meta: {
            return_url: `https://fs-sports-clubv2.onrender.com/payment-confirmation?order_id={order_id}`,
            notify_url: `https://fs-sports-clubv2.onrender.com/api/cashfree/webhook`,
            notes: slotInfo // This will include date, timeSlots, etc.
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

  // API endpoint to fetch slot availability
  app.get('/api/slots/availability', async (req, res) => {
    const { date, sportType } = req.query;
    if (!date || !sportType) {
      return res.status(400).json({ success: false, error: 'Missing date or sportType' });
    }
    
    try {
      // Get booked slots
      const bookedSlotsSnapshot = await firestore.collection('bookings')
        .where('date', '==', date)
        .where('sportType', '==', sportType)
        .where('paymentStatus', '==', 'success')
        .get();
      
      // Get blocked slots
      const blockedSlotsSnapshot = await firestore.collection('blockedSlots')
        .where('date', '==', date)
        .where('sportType', '==', sportType)
        .get();
      
      // Get slot availability data
      const slotAvailabilitySnapshot = await firestore.collection('slotAvailability')
        .where('date', '==', date)
        .where('sportType', '==', sportType)
        .get();
      
      const bookedSlots = bookedSlotsSnapshot.docs.flatMap(doc => {
        const data = doc.data();
        return Array.isArray(data.timeSlots) ? data.timeSlots : [data.timeSlot || data.timeSlots];
      });
      
      const blockedSlots = blockedSlotsSnapshot.docs.map(doc => doc.data().timeSlot);
      
      const slotAvailability = slotAvailabilitySnapshot.docs.map(doc => doc.data());
      
      return res.json({
        success: true,
        slots: slotAvailability,
        bookedSlots,
        blockedSlots,
        date,
        sportType
      });
    } catch (error) {
      console.error('Error fetching slot availability:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch slot availability' });
    }
  });

  // Test endpoint to create a booking manually (for testing)
  app.post('/api/test/create-booking', async (req, res) => {
    try {
      const { orderId, amount, customerDetails, slotInfo } = req.body;
      
      const bookingData = {
        cashfreeOrderId: orderId,
        cashfreePaymentId: 'test_payment_123',
        cashfreePaymentStatus: 'SUCCESS',
        fullName: customerDetails?.customer_name || 'Test User',
        mobile: customerDetails?.customer_phone || '1234567890',
        email: customerDetails?.customer_email || 'test@example.com',
        amount: amount || 100,
        paymentStatus: 'success',
        bookingType: slotInfo?.tournamentId ? 'tournament' : 'regular',
        status: 'confirmed',
        date: slotInfo?.date || new Date().toISOString().split('T')[0],
        timeSlots: slotInfo?.timeSlots || ['10:00-11:00'],
        sportType: slotInfo?.sportType || 'cricket',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...slotInfo
      };
      
      console.log('Creating test booking:', bookingData);
      await firestore.collection('bookings').add(bookingData);
      console.log('Test booking created successfully');
      
      res.json({ success: true, message: 'Test booking created', bookingId: orderId });
    } catch (error) {
      console.error('Test booking creation failed:', error);
      res.status(500).json({ success: false, error: 'Failed to create test booking' });
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
      // Use Firestore transaction for atomic slot booking
      await firestore.runTransaction(async (transaction) => {
        // 1. Check for duplicate bookingId
        const existingBookingSnap = await transaction.get(
          firestore.collection('bookings').where('bookingId', '==', bookingData.bookingId)
        );
        if (!existingBookingSnap.empty) {
          throw new Error('Duplicate bookingId. This booking already exists.');
        }
        // 2. Check for already booked slots
        const bookingsQuery = firestore.collection('bookings')
          .where('date', '==', date)
          .where('sportType', '==', sportType)
          .where('paymentStatus', '==', 'success');
        const bookingsSnapshot = await transaction.get(bookingsQuery);
        const bookedSlots = bookingsSnapshot.docs.flatMap((doc) => {
          const data = doc.data();
          return Array.isArray(data.timeSlots) ? data.timeSlots : [data.timeSlot];
        });
        for (const slot of timeSlots) {
          if (bookedSlots.includes(slot)) {
            throw new Error(`Slot ${slot} already booked.`);
          }
        }
        // 3. Check for blocked slots
        const blockedSlotsQuery = firestore.collection('blockedSlots')
          .where('date', '==', date)
          .where('sportType', '==', sportType);
        const blockedSlotsSnapshot = await transaction.get(blockedSlotsQuery);
        const blockedSlots = blockedSlotsSnapshot.docs.map((doc) => doc.data().timeSlot);
        for (const slot of timeSlots) {
          if (blockedSlots.includes(slot)) {
            throw new Error(`Slot ${slot} is blocked.`);
          }
        }
        // 4. Check for blocked date
        const blockedDatesQuery = firestore.collection('blockedDates')
          .where('date', '==', date);
        const blockedDatesSnapshot = await transaction.get(blockedDatesQuery);
        if (!blockedDatesSnapshot.empty) {
          throw new Error('This date is completely blocked.');
        }
        // 5. Create booking document
        const bookingRef = firestore.collection('bookings').doc();
        transaction.set(bookingRef, {
          ...bookingData,
          timeSlots,
          sportType,
          date,
          paymentStatus: 'success',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      // 6. Broadcast slot update
      if (wsManager && wsManager.sendSlotUpdate) {
        const updatedBookingsSnapshot = await firestore.collection('bookings')
          .where('date', '==', date)
          .where('sportType', '==', sportType)
          .where('paymentStatus', '==', 'success').get();
        const updatedBookedSlots = updatedBookingsSnapshot.docs.flatMap((doc) => {
          const data = doc.data();
          return Array.isArray(data.timeSlots) ? data.timeSlots : [data.timeSlot];
        });
        wsManager.sendSlotUpdate(date, sportType, updatedBookedSlots);
      }
      res.json({ success: true });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      if (error.message && error.message.includes('already booked')) {
        return res.status(409).json({ error: error.message });
      }
      if (error.message && error.message.includes('Duplicate bookingId')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Booking failed', details: error.message });
    }
  });

  return httpServer;
}
