import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import WebSocketManager from "./websocket";
import crypto from "crypto";
import admin from 'firebase-admin';
import axios from 'axios';

// Initialize Firebase Admin only once
function initializeFirebase() {
  if (!admin.apps.length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
    }
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
    });
  }
  return admin.firestore();
}

// Helper to normalize time slots
function normalizeTimeSlot(slot: string): string {
  if (/AM|PM|am|pm/.test(slot)) return slot;
  const [start, end] = slot.split('-');
  const to12h = (t: string): string => {
    const [hStr, m] = t.split(':');
    let hNum = parseInt(hStr, 10);
    const ampm = hNum >= 12 ? 'PM' : 'AM';
    hNum = hNum % 12;
    if (hNum === 0) hNum = 12;
    return `${hNum.toString().padStart(2, '0')}:${m} ${ampm}`;
  };
  if (start && end) return `${to12h(start)} - ${to12h(end)}`;
  return slot;
}

// Types for webhook handler
interface Tournament {
  remainingSlots: number;
  [key: string]: any;
}

interface BookingDoc {
  cashfreeOrderId: string;
  cashfreePaymentId: string;
  cashfreePaymentStatus: string;
  amount: number;
  paymentStatus: 'success';
  status: 'confirmed';
  bookingType: 'tournament' | 'regular';
  createdAt: admin.firestore.FieldValue;
  updatedAt: admin.firestore.FieldValue;
  date: string;
  sportType: string;
  timeSlots: string[];
  facilityTypes: string[];
  bookingId: string;
  fullName: string;
  mobile: string;
  email: string;
  tournamentId?: string;
  tournamentName?: string;
  teamName?: string;
  captainName?: string;
  teamMembers?: string[];
  captainMobile?: string;
  captainEmail?: string;
}

// Export the webhook handler for use in index.ts
export const cashfreeWebhookHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const firestore = initializeFirebase();

    // Verify webhook signature
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
    const payload = req.body as Buffer;

    if (!clientSecret) {
      console.error('CASHFREE_CLIENT_SECRET not configured');
      return res.status(500).json({ error: 'Client secret not configured' });
    }

    if (!signature || !timestamp) {
      console.error('Missing webhook headers: signature or timestamp');
      return res.status(401).json({ error: 'Missing webhook headers' });
    }

    // Verify signature
    const dataToSign = timestamp + payload.toString('utf8');
    const expectedSignature = crypto.createHmac('sha256', clientSecret)
      .update(dataToSign)
      .digest('base64');

    if (signature !== expectedSignature) {
      console.error('Invalid Cashfree webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse webhook payload
    const event = JSON.parse(payload.toString('utf8'));
    console.log('Webhook event received:', JSON.stringify(event, null, 2));

    if ((event.event === 'PAYMENT_SUCCESS') || (event.type === 'PAYMENT_SUCCESS_WEBHOOK')) {
      const payment = event.data?.payment;
      const order = event.data?.order;

      if (!payment || !order) {
        console.error('Invalid webhook payload', event);
        return res.status(400).json({ error: 'Invalid webhook payload' });
      }

      // Get slot info from order metadata
      let finalSlotInfo = order.order_meta?.notes || {};
      
      if (!finalSlotInfo.date || !finalSlotInfo.timeSlots || !finalSlotInfo.sportType) {
        try {
          const tempDoc = await firestore.collection('tempBookings').doc(order.order_id).get();
          if (tempDoc.exists) {
            const tempData = tempDoc.data();
            finalSlotInfo = {
              date: tempData?.date || new Date().toISOString().split('T')[0],
              timeSlots: tempData?.timeSlots || ['10:00-11:00'],
              sportType: tempData?.sportType || 'cricket',
              bookingId: order.order_id,
              ...(tempData || {})
            };
            await firestore.collection('tempBookings').doc(order.order_id).delete();
          } else {
            console.error('Missing booking data');
            return res.status(400).json({ error: 'Missing booking data' });
          }
        } catch (error) {
          console.error('Error processing booking:', error);
          return res.status(500).json({ error: 'Failed to process booking' });
        }
      }

      try {
        // Process booking in transaction
        const success = await firestore.runTransaction(async (t) => {
          // Check for existing booking
          const existingBookings = await t.get(
            firestore.collection('bookings')
              .where('cashfreeOrderId', '==', order.order_id)
          );

          if (!existingBookings.empty) {
            console.log('Booking already exists for orderId:', order.order_id);
            return true;
          }

          // Prepare booking data
          const isTournament = Boolean(finalSlotInfo.tournamentId || finalSlotInfo.bookingType === 'tournament');
          const timeSlotsArr = Array.isArray(finalSlotInfo.timeSlots) 
            ? finalSlotInfo.timeSlots 
            : [finalSlotInfo.timeSlots];
          const normalizedSlots = timeSlotsArr.map(normalizeTimeSlot);

          // Create booking document
          const bookingDoc: BookingDoc = {
            cashfreeOrderId: order.order_id,
            cashfreePaymentId: payment.cf_payment_id || payment.payment_id,
            cashfreePaymentStatus: payment.payment_status,
            amount: order.order_amount,
            paymentStatus: 'success',
            status: 'confirmed',
            bookingType: isTournament ? 'tournament' : 'regular',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            date: finalSlotInfo.date,
            sportType: finalSlotInfo.sportType,
            timeSlots: isTournament ? ['Tournament'] : normalizedSlots,
            facilityTypes: [finalSlotInfo.sportType],
            bookingId: order.order_id,
            fullName: isTournament 
              ? (finalSlotInfo.captainName || order.customer_details?.customer_name || 'Captain')
              : (order.customer_details?.customer_name || 'Unknown'),
            mobile: order.customer_details?.customer_phone || '',
            email: order.customer_details?.customer_email || '',
            ...(isTournament ? {
              tournamentId: finalSlotInfo.tournamentId || '',
              tournamentName: finalSlotInfo.tournamentName || 'Tournament',
              teamName: finalSlotInfo.teamName || 'Team',
              captainName: finalSlotInfo.captainName || order.customer_details?.customer_name || 'Captain',
              teamMembers: Array.isArray(finalSlotInfo.teamMembers) ? finalSlotInfo.teamMembers : [],
              captainMobile: finalSlotInfo.captainMobile || order.customer_details?.customer_phone || '',
              captainEmail: finalSlotInfo.captainEmail || order.customer_details?.customer_email || ''
            } : {})
          };

          const bookingRef = firestore.collection('bookings').doc();

          if (isTournament && bookingDoc.tournamentId) {
            // Verify tournament exists and has slots
            const tournamentRef = firestore.collection('tournaments').doc(bookingDoc.tournamentId);
            const tournamentSnap = await t.get(tournamentRef);

            if (!tournamentSnap.exists) {
              console.error('Tournament not found:', bookingDoc.tournamentId);
              return false;
            }

            const tournament = tournamentSnap.data() as Tournament;
            if (!tournament || tournament.remainingSlots <= 0) {
              console.error('No slots available for tournament:', bookingDoc.tournamentId);
              return false;
            }

            // Update tournament slots
            t.update(tournamentRef, {
              remainingSlots: admin.firestore.FieldValue.increment(-1),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          } else {
            // Check for slot conflicts
            const existingSlots = await t.get(
              firestore.collection('bookings')
                .where('date', '==', bookingDoc.date)
                .where('sportType', '==', bookingDoc.sportType)
                .where('paymentStatus', '==', 'success')
                .where('bookingType', '==', 'regular')
            );

            const bookedSlots = existingSlots.docs.flatMap((doc) => {
              const data = doc.data();
              return Array.isArray(data.timeSlots) ? data.timeSlots : [data.timeSlots];
            });

            const conflicts = normalizedSlots.filter((slot: string) => bookedSlots.includes(slot));
            if (conflicts.length > 0) {
              console.error('Slots already booked:', conflicts);
              return false;
            }

            // Update slot availability
            for (const timeSlot of normalizedSlots) {
              const availabilityRef = firestore.collection('slotAvailability').doc();
              t.set(availabilityRef, {
                date: bookingDoc.date,
                sportType: bookingDoc.sportType,
                timeSlot,
                status: 'booked',
                bookingId: bookingDoc.bookingId,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
              });
            }
          }

          // Save booking document
          t.set(bookingRef, bookingDoc);
          return true;
        });

        if (!success) {
          throw new Error('Failed to process booking');
        }

        return res.status(200).json({ message: 'Booking processed successfully' });
      } catch (error) {
        console.error('Error in booking transaction:', error);
        return res.status(500).json({ error: 'Failed to process booking transaction' });
      }
    }
    
    console.log('Event ignored:', event.event || event.type);
    return res.status(200).json({ message: 'Event ignored' });
  } catch (error) {
    console.error('Cashfree webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Initialize server
export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wsManager = new WebSocketManager(httpServer);

  app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/ws/stats', (_, res) => {
    res.json(wsManager.getStats());
  });

  app.set('wsManager', wsManager);
  return httpServer;
}

// Cashfree API URL based on environment
const cashfreeApiUrl = process.env.NODE_ENV === 'production'
  ? 'https://api.cashfree.com/pg/orders'
  : 'https://sandbox.cashfree.com/pg/orders';
