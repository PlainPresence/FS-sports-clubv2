import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import ConfirmationSection from '@/components/ConfirmationSection';
import LoadingSpinner from '@/components/LoadingSpinner';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';

interface BookingData extends DocumentData {
  id: string;
  bookingId?: string;
  orderId?: string;
  paymentStatus: string;
  sportType?: string;
  bookingDate?: string;
  teamName?: string;
  captainName?: string;
  captainMobile?: string;
  bookingType?: 'regular' | 'tournament';
}

export default function PaymentConfirmation() {
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [location] = useLocation();
  const retries = useRef(0);
  const maxRetries = 20; // Increased to 20 x 3s = 60s for tournament bookings

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId') || params.get('order_id');
    const bookingId = params.get('bookingId');
    const isTournament = params.get('type') === 'tournament';

    if (!orderId && !bookingId) {
      setError('Missing booking reference in URL.');
      setLoading(false);
      return;
    }

    let timeout: NodeJS.Timeout;

    const fetchBooking = async () => {
      setLoading(true);
      try {
        // Build queries for both orderId and bookingId
        const queries = [];
        
        // Tournament booking queries
        if (orderId) {
          queries.push(
            query(collection(db, 'tournamentBookings'), where('orderId', '==', orderId))
          );
        }
        if (bookingId) {
          queries.push(
            query(collection(db, 'tournamentBookings'), where('bookingId', '==', bookingId))
          );
        }
        
        // Regular booking query (if not explicitly tournament)
        if (!isTournament && orderId) {
          queries.push(
            query(collection(db, 'bookings'), where('orderId', '==', orderId))
          );
        }

        // Try all queries until we find a match
        let foundBooking = null;
        for (const q of queries) {
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            foundBooking = {
              id: doc.id,
              ...doc.data(),
              bookingType: doc.ref.parent.id === 'tournamentBookings' ? 'tournament' : 'regular'
            } as BookingData;
            break;
          }
        }

        if (foundBooking) {
          console.log('Found booking:', { 
            id: foundBooking.id, 
            type: foundBooking.bookingType, 
            status: foundBooking.paymentStatus 
          });

          // For tournament bookings, we consider pending as a valid state initially
          if (foundBooking.paymentStatus === 'success' || 
              (foundBooking.bookingType === 'tournament' && foundBooking.paymentStatus === 'pending' && retries.current < 5)) {
            setBookingData(foundBooking);
            setPending(foundBooking.paymentStatus === 'pending');
            setError(null);
            
            // Continue checking if payment is pending
            if (foundBooking.paymentStatus === 'pending') {
              timeout = setTimeout(fetchBooking, 3000);
            }
          } else if (foundBooking.paymentStatus === 'pending') {
            if (retries.current < maxRetries) {
              console.log('Payment still pending, retry:', retries.current + 1);
              retries.current += 1;
              setPending(true);
              timeout = setTimeout(fetchBooking, 3000);
            } else {
              setError('Payment confirmation is taking longer than expected. Please check your email for confirmation.');
              setPending(false);
            }
          } else {
            setError(`Payment ${foundBooking.paymentStatus}. Please try again or contact support.`);
            setPending(false);
          }
        } else {
          if (retries.current < maxRetries) {
            console.log('Booking not found, retry:', retries.current + 1);
            retries.current += 1;
            setPending(true);
            timeout = setTimeout(fetchBooking, 3000);
          } else {
            setError('Booking not found. Please check your email for confirmation or contact support.');
            setPending(false);
          }
        }
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError('Failed to fetch booking details. Please try refreshing the page.');
        setPending(false);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [location]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (pending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
        <div className="mt-4 text-blue-600 text-xl text-center">
          Payment is processing...<br />
          Please wait while we confirm your booking.<br />
          <span className="text-sm text-gray-600">
            This may take up to 60 seconds
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-600 text-xl text-center mb-4">
          {error}
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Refresh Page
        </button>
        <div className="mt-4 text-sm text-gray-600 text-center">
          {new URLSearchParams(window.location.search).get('orderId') && 
            `Order ID: ${new URLSearchParams(window.location.search).get('orderId')}`}
          {new URLSearchParams(window.location.search).get('bookingId') && 
            `Booking ID: ${new URLSearchParams(window.location.search).get('bookingId')}`}
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return null;
  }

  return (
    <ConfirmationSection
      bookingData={bookingData}
      onBookAnother={() => window.location.href = '/'}
    />
  );
}
