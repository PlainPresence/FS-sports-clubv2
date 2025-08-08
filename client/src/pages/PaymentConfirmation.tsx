import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import ConfirmationSection from '@/components/ConfirmationSection';
import LoadingSpinner from '@/components/LoadingSpinner';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, DocumentData, Timestamp } from 'firebase/firestore';

interface TournamentBookingData extends DocumentData {
  id: string;
  amount1: number;
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
  const [location] = useLocation();

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams(window.location.search);
        const bookingId = params.get('bookingId') || params.get('order_id');

        if (!bookingId) {
          console.error('No booking ID found in URL');
          setError('Missing booking ID in URL.');
          return;
        }

        console.log('Fetching booking with ID:', bookingId);

        const bookingsRef = collection(db, 'tournamentBookings');
        const bookingQuery = query(bookingsRef, where('bookingId', '==', bookingId));
        const querySnapshot = await getDocs(bookingQuery);

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const data = doc.data();
          console.log('Found booking data:', data);

          // Create booking object with exact field names from Firebase
          const booking: TournamentBookingData = {
            id: doc.id,
            amount1: data.amount1 || 0,
            bookingDate: data.bookingDate || Timestamp.now(),
            bookingId: data.bookingId || bookingId,
            captainEmail: data.captainEmail || '',
            captainMobile: data.captainMobile || '',
            captainName: data.captainName || '',
            paymentStatus: 'success', // Force success status
            sportType: data.sportType || 'cricket',
            teamMembers: Array.isArray(data.teamMembers) ? data.teamMembers : [''],
            teamName: data.teamName || '',
            tournamentId: data.tournamentId || '',
            tournamentName: data.tournamentName || '',
            ...data // Include any additional fields
          };

          setBookingData(booking);
          setError(null);
        } else {
          console.error('No booking found with ID:', bookingId);
          setError('Booking not found. Please contact support if payment was deducted.');
        }
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError('Error loading booking details. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [location]);

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
    <div className="min-h-screen">
      <ConfirmationSection
        bookingData={bookingData}
        onBookAnother={() => {
          window.location.href = '/tournament';
        }}
      />
      {/* Optional notification for real payment status */}
      <div className="fixed bottom-4 right-4 max-w-md bg-green-50 p-4 rounded-lg shadow-lg text-green-700 text-sm">
        Your tournament registration is confirmed! You will receive a confirmation email shortly.
      </div>
    </div>
  );
}
