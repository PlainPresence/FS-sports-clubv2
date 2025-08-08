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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('bookingId');

    if (!bookingId) {
      setError('Missing booking ID in URL.');
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      try {
        console.log('Fetching tournament booking:', bookingId);

        const querySnapshot = await getDocs(
          query(
            collection(db, 'tournamentBookings'),
            where('bookingId', '==', bookingId)
          )
        );

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const data = doc.data();
          console.log('Found booking data:', data);

          const booking = {
            id: doc.id,
            ...data,
          } as TournamentBookingData;

          // Set booking data regardless of payment status
          setBookingData(booking);
          setError(null);
        } else {
          setError('Unable to find booking details. Please check your email for confirmation or contact support.');
        }
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError('Error fetching booking details. Please check your email or contact support.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
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
    <>
      <ConfirmationSection
        bookingData={{
          ...bookingData,
          // Override payment status to always show success on confirmation page
          paymentStatus: 'success'
        }}
        onBookAnother={() => window.location.href = '/tournament'}
      />
      {bookingData.paymentStatus === 'pending' && (
        <div className="fixed bottom-0 left-0 right-0 bg-blue-50 p-4 text-center text-sm text-blue-600">
          Note: Payment confirmation is in process. You will receive an email once fully confirmed.
        </div>
      )}
    </>
  );
}
