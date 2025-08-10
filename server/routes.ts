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
// Helper to pad hour for 12h time with leading zero
function pad12h(s: string): string {
  const [h, rest] = s.split(':');
  return h.padStart(2, '0') + ':' + rest;
}
// Helper to convert 24h to 12h with leading zero
function to12h(t: string): string {
  const [hStr, m] = t.split(':');
  let hNum = parseInt(hStr, 10);
  const ampm = hNum >= 12 ? 'PM' : 'AM';
  hNum = hNum % 12;
  if (hNum === 0) hNum = 12;
  return `${hNum.toString().padStart(2, '0')}:${m} ${ampm}`;
}
// Helper to normalize a time slot string to 'hh:mm AM/PM - hh:mm AM/PM' with leading zero
function normalizeTimeSlot(slot: string): string {
  // If already in correct format, reformat to ensure leading zero
  if (/AM|PM|am|pm/.test(slot)) {
    // e.g. '7:00 PM - 8:00 PM' => '07:00 PM - 08:00 PM'
    const [start, end] = slot.split(' - ');
    if (start && end) return `${pad12h(start)} - ${pad12h(end)}`;
    return slot;
  }
  // Convert 'HH:mm-HH:mm' to 'hh:mm AM/PM - hh:mm AM/PM'
  const [start, end] = slot.split('-');
  if (start && end) return `${to12h(start)} - ${to12h(end)}`;
  return slot;
}

export const cashfreeWebhookHandler = async (req: Request, res: Response) => {

  try {
    // Use the raw body (Buffer) for signature verification
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
    const payload = req.body as Buffer;
    
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

      // Get WebSocket manager from app
      const wsManager: WebSocketManager = req.app.get('wsManager');

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
  await firestore.runTransaction(async (transaction: any) => {
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
        console.log('Checking for double booking on date:', finalSlotInfo.date, 'with slots:', normalizedTimeSlotsArr);
        
        const existingBookings = await transaction.get(
          firestore.collection('bookings')
            .where('date', '==', finalSlotInfo.date)
            .where('sportType', '==', finalSlotInfo.sportType)
            .where('paymentStatus', '==', 'success')
        );
        
        const bookedSlots: string[] = existingBookings.docs.flatMap((doc: any) => {
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

        // Ensure we have minimum required data for booking
        bookingData = {
          cashfreeOrderId: order.order_id,
          cashfreePaymentId: payment.cf_payment_id || payment.payment_id,
          cashfreePaymentStatus: payment.payment_status,
          fullName: order.customer_details?.customer_name || event.data.customer_details?.customer_name,
          mobile: order.customer_details?.customer_phone || event.data.customer_details?.customer_phone,
          email: order.customer_details?.customer_email || event.data.customer_details?.customer_email,
          amount: order.order_amount,
          paymentStatus: 'success',
          bookingType: finalSlotInfo.tournamentId ? 'tournament' : 'regular',
          status: 'confirmed',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          // Set expiry to 30 minutes from now (in case of future processing needs)
          expiresAt: admin.firestore.FieldValue.serverTimestamp(),
          // Add customer details in the expected format
          customerDetails: {
            customer_name: order.customer_details?.customer_name || event.data.customer_details?.customer_name || '',
            customer_phone: order.customer_details?.customer_phone || event.data.customer_details?.customer_phone || '',
            customer_email: order.customer_details?.customer_email || event.data.customer_details?.customer_email || '',
            customer_id: order.order_id
          },
          ...finalSlotInfo,
          timeSlots: normalizedTimeSlotsArr // Always store normalized time slots
        };
        
        console.log('Booking data to save:', bookingData);
        const bookingRef = firestore.collection('bookings').doc();
        transaction.set(bookingRef, bookingData);
        bookingData.id = bookingRef.id; // Add the document ID for WebSocket

        // Update slot availability in real-time inside the transaction
        if (bookingData.date && bookingData.timeSlots && bookingData.sportType) {
          const timeSlots = Array.isArray(bookingData.timeSlots) ? bookingData.timeSlots : [bookingData.timeSlots];
          for (const timeSlot of timeSlots) {
            const normalizedSlot = normalizeTimeSlot(timeSlot);
            const slotDocId = `${bookingData.date}_${bookingData.sportType}_${normalizedSlot}`.replace(/[^a-zA-Z0-9_]/g, '_');
            const slotAvailabilityRef = firestore.collection('slotAvailability').doc(slotDocId);
            transaction.set(slotAvailabilityRef, {
              date: bookingData.date,
              sportType: bookingData.sportType,
              timeSlot: normalizedSlot,
              status: 'booked',
              bookingId: bookingData.bookingId || bookingData.cashfreeOrderId,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      });
      
      console.log('Booking created successfully in Firebase (transaction)');
      
      // Broadcast booking confirmation via WebSocket
      if (wsManager && bookingData) {
        try {
          // Convert Firestore timestamps to dates for WebSocket
          const wsBookingData = {
            ...bookingData,
            createdAt: new Date(),
            updatedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
          };
          
          console.log('Broadcasting booking confirmation via WebSocket');
          wsManager.sendBookingConfirmed(wsBookingData);
          
          // Also send slot update for real-time availability
          wsManager.sendSlotUpdate(bookingData.date, bookingData.sportType, []);
        } catch (wsError) {
          console.error('WebSocket broadcast error:', wsError);
          // Don't fail the webhook for WebSocket errors
        }
      }
      
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
  const httpServer = createServer(app);

  // Initialize WebSocket manager
  const wsManager = new WebSocketManager(httpServer);

  // Add WebSocket manager to app for use in other parts
  app.set('wsManager', wsManager);

  // Health check endpoint
  app.get('/api/health', (req: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // WebSocket stats endpoint
  app.get('/api/ws/stats', (req: any, res: any) => {
    res.json(wsManager.getStats());
  });

  // Cashfree: Create payment session endpoint
  app.post('/api/cashfree/create-session', async (req: any, res: any) => {
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
  app.get('/api/booking/by-cashfree-order', async (req: any, res: any) => {
    const { orderId } = req.query;
    if (!orderId) return res.status(400).json({ success: false, error: 'Missing orderId' });
    
    try {
      const snapshot = await firestore.collection('bookings').where('cashfreeOrderId', '==', orderId).limit(1).get();
      if (snapshot.empty) return res.status(404).json({ success: false, error: 'Booking not found' });
      
      const booking = snapshot.docs[0].data();
      // Convert Firestore timestamps to Date objects
      const formattedBooking = {
        ...booking,
        createdAt: booking.createdAt?.toDate(),
        updatedAt: booking.updatedAt?.toDate(),
        expiresAt: booking.expiresAt?.toDate(),
      };
      
      return res.json({ success: true, booking: formattedBooking });
    } catch (error) {
      console.error('Error fetching booking:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch booking' });
    }
  });

  // API endpoint to fetch slot availability with WebSocket integration
  app.get('/api/slots/availability', async (req: any, res: any) => {
    const { date, sportType } = req.query;
    if (!date || !sportType) {
      return res.status(400).json({ success: false, error: 'Missing date or sportType' });
    }
    
    try {
      // Get booked slots - updated to handle timeSlots array
      const bookedSlotsSnapshot = await firestore.collection('bookings')
        .where('date', '==', date)
        .where('sportType', '==', sportType)
        .where('paymentStatus', '==', 'success')
        .where('status', '==', 'confirmed')
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
      
      // Extract booked slots from timeSlots arrays (updated structure)
      const bookedSlots = bookedSlotsSnapshot.docs.flatMap((doc: any) => {
        const data = doc.data();
        if (data.timeSlots && Array.isArray(data.timeSlots)) {
          return data.timeSlots.map(normalizeTimeSlot);
        }
        return data.timeSlot ? [normalizeTimeSlot(data.timeSlot)] : [];
      });
      
      const blockedSlots = blockedSlotsSnapshot.docs.map((doc: any) => normalizeTimeSlot(doc.data().timeSlot));
      const slotAvailability = slotAvailabilitySnapshot.docs.map((doc: any) => ({
        ...doc.data(),
        timeSlot: normalizeTimeSlot(doc.data().timeSlot)
      }));
      
      return res.json({
        success: true,
        slots: slotAvailability,
  bookedSlots: Array.from(new Set(bookedSlots)), // Remove duplicates
        blockedSlots,
        date,
        sportType
      });
    } catch (error) {
      console.error('Error fetching slot availability:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch slot availability' });
    }
  });

  // Book slot endpoint with WebSocket integration
  app.post('/api/book-slot', async (req: any, res: any) => {
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
      let createdBooking: any = null;
      // Normalize all time slots for this booking
      const normalizedTimeSlots = timeSlots.map(normalizeTimeSlot);
      
      // Use Firestore transaction for atomic slot booking
  await firestore.runTransaction(async (transaction: any) => {
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
          .where('paymentStatus', '==', 'success')
          .where('status', '==', 'confirmed');
        const bookingsSnapshot = await transaction.get(bookingsQuery);
        
        const bookedSlots = bookingsSnapshot.docs.flatMap((doc: any) => {
          const data = doc.data();
          return Array.isArray(data.timeSlots) ? data.timeSlots.map(normalizeTimeSlot) : [normalizeTimeSlot(data.timeSlot)];
        });
        
        for (const slot of normalizedTimeSlots) {
          if (bookedSlots.includes(slot)) {
            throw new Error(`Slot ${slot} already booked.`);
          }
        }
        
        // 3. Check for blocked slots
        const blockedSlotsQuery = firestore.collection('blockedSlots')
          .where('date', '==', date)
          .where('sportType', '==', sportType);
        const blockedSlotsSnapshot = await transaction.get(blockedSlotsQuery);
  const blockedSlots = blockedSlotsSnapshot.docs.map((doc: any) => normalizeTimeSlot(doc.data().timeSlot));
        
        for (const slot of normalizedTimeSlots) {
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
        
        // 5. Create booking document with proper structure
        const bookingRef = firestore.collection('bookings').doc();
        createdBooking = {
          ...bookingData,
          timeSlots: normalizedTimeSlots,
          sportType,
          date,
          paymentStatus: 'success',
          status: 'confirmed',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.FieldValue.serverTimestamp(), // Set to current time since it's confirmed
          id: bookingRef.id
        };
        transaction.set(bookingRef, createdBooking);

        // Update slotAvailability for each booked slot
        if (date && normalizedTimeSlots && sportType) {
          for (const timeSlot of normalizedTimeSlots) {
            // Use a deterministic doc id for easy cleanup: `${date}_${sportType}_${timeSlot}`
            const slotDocId = `${date}_${sportType}_${timeSlot}`.replace(/[^a-zA-Z0-9_]/g, '_');
            const slotAvailabilityRef = firestore.collection('slotAvailability').doc(slotDocId);
            transaction.set(slotAvailabilityRef, {
              date,
              sportType,
              timeSlot,
              status: 'booked',
              bookingId: bookingData.bookingId,
              lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      });
      
      // 6. Broadcast updates via WebSocket
      if (wsManager && createdBooking) {
        try {
          // Convert timestamps for WebSocket
          const wsBookingData = {
            ...createdBooking,
            createdAt: new Date(),
            updatedAt: new Date(),
            expiresAt: new Date()
          };
          
          // Send booking confirmation
          wsManager.sendBookingConfirmed(wsBookingData);
          
          // Send slot update
          wsManager.sendSlotUpdate(date, sportType, []);
        } catch (wsError) {
          console.error('WebSocket broadcast error:', wsError);
          // Don't fail the booking for WebSocket errors
        }
      }
      
      res.json({ success: true, booking: createdBooking });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      console.error('Booking error:', error);
      
      if (error.message && error.message.includes('already booked')) {
        return res.status(409).json({ error: error.message });
      }
      if (error.message && error.message.includes('Duplicate bookingId')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Booking failed', details: error.message });
    }
  });

  // Admin endpoint to block slots with WebSocket notification
  app.post('/api/admin/block-slot', async (req: any, res: any) => {
    const { date, sportType, timeSlot, reason } = req.body;
    
    if (!date || !sportType || !timeSlot) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
      await firestore.collection('blockedSlots').add({
        date,
        sportType,
        timeSlot,
        reason: reason || 'Blocked by admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Broadcast slot blocked via WebSocket
      if (wsManager) {
        wsManager.sendSlotBlocked(date, sportType, [timeSlot], reason);
      }
      
      res.json({ success: true, message: 'Slot blocked successfully' });
    } catch (error) {
      console.error('Error blocking slot:', error);
      res.status(500).json({ error: 'Failed to block slot' });
    }
  });

  // Admin endpoint to unblock/free slots with WebSocket notification
  app.post('/api/admin/free-slot', async (req: any, res: any) => {
    const { date, sportType, timeSlot } = req.body;
    
    if (!date || !sportType || !timeSlot) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
      // Remove from blocked slots
      const blockedQuery = await firestore.collection('blockedSlots')
        .where('date', '==', date)
        .where('sportType', '==', sportType)
        .where('timeSlot', '==', timeSlot)
        .get();
      
      const batch = firestore.batch();
  blockedQuery.docs.forEach((doc: any) => batch.delete(doc.ref));
      await batch.commit();
      
      // Broadcast slot freed via WebSocket
      if (wsManager) {
        wsManager.sendSlotFreed(date, sportType, [timeSlot]);
      }
      
      res.json({ success: true, message: 'Slot freed successfully' });
    } catch (error) {
      console.error('Error freeing slot:', error);
      res.status(500).json({ error: 'Failed to free slot' });
    }
  });

  // Endpoint to manually check and process expired bookings
  app.post('/api/admin/process-expired-bookings', async (req: any, res: any) => {
    try {
      const now = admin.firestore.Timestamp.now();
      const expiredQuery = await firestore.collection('bookings')
        .where('expiresAt', '<', now)
        .where('status', '!=', 'confirmed')
        .where('status', '!=', 'expired')
        .get();
      
      const expiredBookings: any[] = [];
      const batch = firestore.batch();
      
      expiredQuery.docs.forEach((doc: any) => {
        const bookingData = { id: doc.id, ...doc.data() };
        expiredBookings.push(bookingData);
        // Update status to expired
        batch.update(doc.ref, {
          status: 'expired',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
      
      // Broadcast expired bookings via WebSocket
      if (wsManager) {
        expiredBookings.forEach(booking => {
          const wsBookingData = {
            ...booking,
            createdAt: booking.createdAt?.toDate() || new Date(),
            updatedAt: new Date(),
            expiresAt: booking.expiresAt?.toDate() || new Date()
          };
          wsManager.sendBookingExpired(wsBookingData);
        });
      }
      
      res.json({ 
        success: true, 
        message: `Processed ${expiredBookings.length} expired bookings`,
        expiredBookings: expiredBookings.length
      });
    } catch (error) {
      console.error('Error processing expired bookings:', error);
      res.status(500).json({ error: 'Failed to process expired bookings' });
    }
  });

  // Test endpoint to create a booking manually (for testing)
  app.post('/api/test/create-booking', async (req: any, res: any) => {
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
        expiresAt: admin.firestore.FieldValue.serverTimestamp(),
        customerDetails: {
          customer_name: customerDetails?.customer_name || 'Test User',
          customer_phone: customerDetails?.customer_phone || '1234567890',
          customer_email: customerDetails?.customer_email || 'test@example.com',
          customer_id: orderId || 'test_123'
        },
        ...slotInfo
      };
      
      console.log('Creating test booking:', bookingData);
      const docRef = await firestore.collection('bookings').add(bookingData);
      console.log('Test booking created successfully');
      
      // Broadcast test booking via WebSocket
      if (wsManager) {
        const wsBookingData = {
          ...bookingData,
          id: docRef.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date()
        };
        wsManager.sendBookingConfirmed(wsBookingData);
      }
      
      res.json({ success: true, message: 'Test booking created', bookingId: orderId, id: docRef.id });
    } catch (error) {
      console.error('Test booking creation failed:', error);
      res.status(500).json({ success: false, error: 'Failed to create test booking' });
    }
  });

  // WebSocket endpoint to send system messages
  app.post('/api/admin/send-system-message', async (req: any, res: any) => {
    const { message, level } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    try {
      if (wsManager) {
        wsManager.sendSystemMessage(message, level || 'info');
        res.json({ success: true, message: 'System message sent' });
      } else {
        res.status(500).json({ error: 'WebSocket manager not available' });
      }
    } catch (error) {
      console.error('Error sending system message:', error);
      res.status(500).json({ error: 'Failed to send system message' });
    }
  });

  // Enhanced booking management endpoints with WebSocket integration

  // Get all bookings with real-time updates capability
  app.get('/api/bookings', async (req: any, res: any) => {
    const { date, status, search, limit = 50, offset = 0 } = req.query;
    
    try {
      let query = firestore.collection('bookings').orderBy('createdAt', 'desc');
      
      if (date) {
        query = query.where('date', '==', date);
      }
      
      if (status) {
        query = query.where('status', '==', status);
      }
      
      if (limit) {
        query = query.limit(parseInt(limit as string));
      }
      
      if (offset && parseInt(offset as string) > 0) {
        // For pagination, you might want to use cursor-based pagination
        // This is a simple offset implementation
        query = query.offset(parseInt(offset as string));
      }
      
      const snapshot = await query.get();
      let bookings = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate(),
      }));
      
      // Apply search filter if provided
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        bookings = bookings.filter((booking: any) =>
          booking.mobile?.includes(searchTerm) ||
          booking.bookingId?.toLowerCase().includes(searchTerm) ||
          booking.fullName?.toLowerCase().includes(searchTerm) ||
          booking.customerDetails?.customer_name?.toLowerCase().includes(searchTerm) ||
          booking.customerDetails?.customer_phone?.includes(searchTerm) ||
          booking.email?.toLowerCase().includes(searchTerm)
        );
      }
      
      res.json({
        success: true,
        bookings,
        total: bookings.length,
        hasMore: snapshot.size === parseInt(limit as string)
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
    }
  });

  // Update booking status with WebSocket notification
  app.patch('/api/bookings/:bookingId', async (req: any, res: any) => {
    const { bookingId } = req.params;
    const updates = req.body;
    
    try {
      const bookingRef = firestore.collection('bookings').doc(bookingId);
      const bookingDoc = await bookingRef.get();
      
      if (!bookingDoc.exists) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }
      
      const currentBooking = bookingDoc.data();
      
      await bookingRef.update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Get updated booking data
      const updatedDoc = await bookingRef.get();
      const updatedBooking = {
        id: updatedDoc.id,
        ...updatedDoc.data(),
        createdAt: updatedDoc.data()?.createdAt?.toDate(),
        updatedAt: new Date(),
        expiresAt: updatedDoc.data()?.expiresAt?.toDate(),
      };
      
      // Broadcast update via WebSocket based on status change
      if (wsManager && currentBooking) {
        if (updates.status === 'cancelled' || updates.status === 'expired') {
          // Free up the slots
          wsManager.sendSlotFreed(
            currentBooking.date,
            currentBooking.sportType,
            currentBooking.timeSlots || [currentBooking.timeSlot],
            updatedBooking
          );
        } else if (updates.status === 'confirmed') {
          // Confirm the booking
          wsManager.sendBookingConfirmed(updatedBooking);
        }
        
        // Send slot update regardless
        wsManager.sendSlotUpdate(currentBooking.date, currentBooking.sportType, []);
      }
      
      res.json({ success: true, booking: updatedBooking });
    } catch (error) {
      console.error('Error updating booking:', error);
      res.status(500).json({ success: false, error: 'Failed to update booking' });
    }
  });

  // Get booking analytics
  app.get('/api/analytics/bookings', async (req: any, res: any) => {
    const { startDate, endDate, sportType } = req.query;
    
    try {
      let query = firestore.collection('bookings');
      
      if (startDate) {
        query = query.where('date', '>=', startDate);
      }
      
      if (endDate) {
        query = query.where('date', '<=', endDate);
      }
      
      if (sportType) {
        query = query.where('sportType', '==', sportType);
      }
      
      const snapshot = await query.get();
  const bookings = snapshot.docs.map((doc: any) => doc.data());
      
      const analytics = {
        totalBookings: bookings.length,
        totalRevenue: bookings.reduce((sum: number, booking: any) => sum + (booking.amount || 0), 0),
        confirmedBookings: bookings.filter((b: any) => b.status === 'confirmed').length,
        cancelledBookings: bookings.filter((b: any) => b.status === 'cancelled').length,
        expiredBookings: bookings.filter((b: any) => b.status === 'expired').length,
        pendingBookings: bookings.filter((b: any) => b.status === 'pending').length,
        sportBreakdown: bookings.reduce((acc: any, booking: any) => {
          const sport = booking.sportType || 'unknown';
          acc[sport] = (acc[sport] || 0) + 1;
          return acc;
        }, {}),
        dailyBookings: bookings.reduce((acc: any, booking: any) => {
          const date = booking.date || 'unknown';
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {})
      };
      
      res.json({ success: true, analytics });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
  });

  // Periodic cleanup of expired temp bookings
  const cleanupExpiredTempBookings = async () => {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const expiredQuery = await firestore.collection('tempBookings')
        .where('expiresAt', '<', thirtyMinutesAgo)
        .get();
      
      if (!expiredQuery.empty) {
        const batch = firestore.batch();
  expiredQuery.docs.forEach((doc: any) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`Cleaned up ${expiredQuery.docs.length} expired temp bookings`);
      }
    } catch (error) {
      console.error('Error cleaning up expired temp bookings:', error);
    }
  };

  // Run cleanup every 10 minutes
  setInterval(cleanupExpiredTempBookings, 10 * 60 * 1000);

  // Periodic check for expired bookings
  const checkAndProcessExpiredBookings = async () => {
    try {
      const now = admin.firestore.Timestamp.now();
      const expiredQuery = await firestore.collection('bookings')
        .where('expiresAt', '<', now)
        .where('status', '!=', 'confirmed')
        .where('status', '!=', 'expired')
        .where('status', '!=', 'cancelled')
        .get();
      
      if (!expiredQuery.empty) {
        const batch = firestore.batch();
        const expiredBookings: any[] = [];
        
        expiredQuery.docs.forEach((doc: any) => {
          const bookingData = { id: doc.id, ...doc.data() };
          expiredBookings.push(bookingData);
          batch.update(doc.ref, {
            status: 'expired',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });
        
        await batch.commit();
        
        // Broadcast expired bookings via WebSocket
        if (wsManager) {
          expiredBookings.forEach(booking => {
            const wsBookingData = {
              ...booking,
              createdAt: booking.createdAt?.toDate() || new Date(),
              updatedAt: new Date(),
              expiresAt: booking.expiresAt?.toDate() || new Date()
            };
            wsManager.sendBookingExpired(wsBookingData);
          });
        }
        
        console.log(`Auto-expired ${expiredBookings.length} bookings`);
      }
    } catch (error) {
      console.error('Error in auto-expiry check:', error);
    }
  };

  // Run expiry check every 5 minutes
  setInterval(checkAndProcessExpiredBookings, 5 * 60 * 1000);

  // WebSocket connection test endpoint
  app.get('/api/ws/test', (req: any, res: any) => {
    const { message, type = 'system_message' } = req.query;
    
    if (wsManager) {
      wsManager.sendSystemMessage(
        (message as string) || 'WebSocket test message',
        'info'
      );
      res.json({ success: true, message: 'Test message sent via WebSocket' });
    } else {
      res.status(500).json({ success: false, error: 'WebSocket manager not available' });
    }
  });

  return httpServer;
}
