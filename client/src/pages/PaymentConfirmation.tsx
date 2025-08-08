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
  const maxRetries = 20; // 20 x 3s = 60s

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId') || params.get('order_id');

    if (!orderId) {
      setError('Missing order ID in URL.');
      setLoading(false);
      return;
    }

    let timeout: NodeJS.Timeout;

    const fetchBooking = async () => {
      setLoading(true);
      try {
        console.log('Attempting to fetch booking with orderId:', orderId);

        // First try tournament bookings
        let querySnapshot = await getDocs(
          query(
            collection(db, 'tournamentBookings'),
            where('bookingId', '==', orderId)
          )
        );

        // If not found by bookingId, try orderId
        if (querySnapshot.empty) {
          console.log('Not found by bookingId, trying orderId in tournament bookings');
          querySnapshot = await getDocs(
            query(
              collection(db, 'tournamentBookings'),
              where('orderId', '==', orderId)
            )
          );
        }

        // If still not found, try regular bookings
        if (querySnapshot.empty) {
          console.log('Not found in tournament bookings, trying regular bookings');
          querySnapshot = await getDocs(
            query(
              collection(db, 'bookings'),
              where('orderId', '==', orderId)
            )
          );
        }

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const data = doc.data();
          console.log('Found booking:', data);

          const booking = {
            id: doc.id,
            ...data,
            bookingType: doc.ref.parent.id === 'tournamentBookings' ? 'tournament' : 'regular'
          } as BookingData;

          // Special handling for tournament bookings
          if (booking.bookingType === 'tournament') {
            // For tournament bookings, show booking even if payment is pending
            setBookingData(booking);
            setPending(booking.paymentStatus === 'pending');
            setError(null);

            // Continue polling if payment is pending
            if (booking.paymentStatus === 'pending' && retries.current < maxRetries) {
              console.log('Tournament booking payment pending, will retry');
              retries.current += 1;
              timeout = setTimeout(fetchBooking, 3000);
            }
          } else {
            // For regular bookings, require success status
            if (booking.paymentStatus === 'success') {
              setBookingData(booking);
              setPending(false);
              setError(null);
            } else if (retries.current < maxRetries) {
              console.log('Regular booking payment pending, will retry');
              retries.current += 1;
              setPending(true);
              timeout = setTimeout(fetchBooking, 3000);
            } else {
              setError('Payment confirmation timeout. Please check your email for confirmation.');
              setPending(false);
            }
          }
        } else {
          console.log('No booking found, attempt:', retries.current + 1);
          if (retries.current < maxRetries) {
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
        if (retries.current < maxRetries) {
          retries.current += 1;
          timeout = setTimeout(fetchBooking, 3000);
        } else {
          setError('Failed to fetch booking details. Please refresh the page or contact support.');
          setPending(false);
        }
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
        <div className="mt-2 text-sm text-gray-600">
          Order ID: {new URLSearchParams(window.location.search).get('orderId')}
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
          Order ID: {new URLSearchParams(window.location.search).get('orderId')}
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
