import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import ConfirmationSection from '@/components/ConfirmationSection';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function PaymentConfirmation() {
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location] = useLocation();

  useEffect(() => {
    // Parse order_id from query params
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    if (!orderId) {
      setError('Missing order ID in URL.');
      setLoading(false);
      return;
    }
    // Fetch booking by cashfreeOrderId
    const fetchBooking = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/booking/by-cashfree-order?orderId=${orderId}`);
        const data = await res.json();
        if (!data.success || !data.booking) {
          setError('Booking not found or payment not confirmed.');
        } else {
          setBookingData(data.booking);
        }
      } catch (err) {
        setError('Failed to fetch booking.');
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [location]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner size="lg" /></div>;
  }
  if (error) {
    return <div className="flex flex-col items-center justify-center min-h-screen text-red-600 text-xl">{error}</div>;
  }
  if (!bookingData) {
    return null;
  }
  return (
    <ConfirmationSection bookingData={bookingData} onBookAnother={() => window.location.href = '/'} />
  );
} 