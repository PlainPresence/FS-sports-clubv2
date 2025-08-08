import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import ConfirmationSection from '@/components/ConfirmationSection';
import LoadingSpinner from '@/components/LoadingSpinner';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';

interface BookingData extends DocumentData {
  id: string;
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
  const maxRetries = 10; // 10 x 3s = 30s

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId') || params.get('order_id');
    const isTournament = params.get('type') === 'tournament';

    if (!orderId) {
      setError('Missing order ID in URL.');
      setLoading(false);
      return;
    }

    let timeout: NodeJS.Timeout;

    const fetchBooking = async () => {
      setLoading(true);
      try {
        // Try tournament bookings first if type is tournament, otherwise try regular bookings first
        const collections = isTournament 
          ? ['tournamentBookings', 'bookings']
          : ['bookings', 'tournamentBookings'];

        let foundBooking = null;

        for (const collectionName of collections) {
          const bookingsQuery = query(
            collection(db, collectionName),
            where('orderId', '==', orderId)
          );

          const querySnapshot = await getDocs(bookingsQuery);

          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            foundBooking = {
              id: doc.id,
              ...doc.data(),
              bookingType: collectionName === 'tournamentBookings' ? 'tournament' : 'regular'
            } as BookingData;
            break;
          }
        }

        if (foundBooking) {
          if (foundBooking.paymentStatus === 'success') {
            setBookingData(foundBooking);
            setPending(false);
            setError(null);
          } else if (foundBooking.paymentStatus === 'pending') {
            if (retries.current < maxRetries) {
              retries.current += 1;
              setPending(true);
              timeout = setTimeout(fetchBooking, 3000);
            } else {
              setError('Payment confirmation timed out. If payment was deducted, please contact support.');
              setPending(false);
            }
          } else {
            setError('Payment failed or was cancelled. Please try booking again.');
            setPending(false);
          }
        } else {
          if (retries.current < maxRetries) {
            retries.current += 1;
            setPending(true);
            timeout = setTimeout(fetchBooking, 3000);
          } else {
            setError('Booking not found. If payment was deducted, please contact support.');
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
            This may take up to 30 seconds
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
