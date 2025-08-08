import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import ConfirmationSection from '@/components/ConfirmationSection';
import LoadingSpinner from '@/components/LoadingSpinner';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, DocumentData, Timestamp } from 'firebase/firestore';

interface TournamentBookingData extends DocumentData {
  id: string;
  amount: number;
  bookingDate: Timestamp;
  bookingId: string;
  captainEmail: string;
  captainMobile: string;
  captainName: string;
  paymentStatus: string;
  sportType: string;
  teamMembers: string[];
  teamName: string;
  tournamentId: string;
  tournamentName: string;
}

export default function PaymentConfirmation() {
  const [bookingData, setBookingData] = useState<TournamentBookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [location] = useLocation();
  const retries = useRef(0);
  const maxRetries = 20; // 20 x 3s = 60s

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('bookingId');

    if (!bookingId) {
      setError('Missing booking ID in URL.');
      setLoading(false);
      return;
    }

    let timeout: NodeJS.Timeout;

    const fetchBooking = async () => {
      setLoading(true);
      try {
        console.log('Attempting to fetch tournament booking with bookingId:', bookingId);

        // Query tournament bookings using bookingId
        const tournamentQuery = query(
          collection(db, 'tournamentBookings'),
          where('bookingId', '==', bookingId)
        );

        const querySnapshot = await getDocs(tournamentQuery);

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const data = doc.data();
          console.log('Found tournament booking:', data);

          const booking = {
            id: doc.id,
            ...data,
          } as TournamentBookingData;

          setBookingData(booking);
          
          if (booking.paymentStatus === 'success') {
            setPending(false);
            setError(null);
          } else if (booking.paymentStatus === 'pending') {
            if (retries.current < maxRetries) {
              console.log('Payment pending, retry:', retries.current + 1);
              retries.current += 1;
              setPending(true);
              timeout = setTimeout(fetchBooking, 3000);
            } else {
              // After max retries, still show the booking but with a warning
              setPending(false);
              setError('Payment confirmation is taking longer than expected. You will receive a confirmation email once payment is confirmed.');
            }
          } else {
            setError(`Payment ${booking.paymentStatus}. Please try again or contact support.`);
            setPending(false);
          }
        } else {
          console.log('No booking found, attempt:', retries.current + 1);
          if (retries.current < maxRetries) {
            retries.current += 1;
            setPending(true);
            timeout = setTimeout(fetchBooking, 3000);
          } else {
            setError('Tournament booking not found. Please check your email for confirmation or contact support.');
            setPending(false);
          }
        }
      } catch (err) {
        console.error('Error fetching tournament booking:', err);
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
          Booking ID: {new URLSearchParams(window.location.search).get('bookingId')}
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
          Booking ID: {new URLSearchParams(window.location.search).get('bookingId')}
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
      onBookAnother={() => window.location.href = '/tournament'}
    />
  );
}
