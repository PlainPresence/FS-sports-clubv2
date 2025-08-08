import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import ConfirmationSection from '@/components/ConfirmationSection';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function PaymentConfirmation() {
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [location] = useLocation();
  const retries = useRef(0);
  const maxRetries = 10; // 10 x 3s = 30s

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
        const res = await fetch(`/api/booking/by-cashfree-order?orderId=${orderId}`);
        const data = await res.json();
        if (data.success && data.booking) {
          setBookingData(data.booking);
          setPending(false);
          setError(null);
        } else {
          if (retries.current < maxRetries) {
            setPending(true);
            retries.current += 1;
            timeout = setTimeout(fetchBooking, 3000);
          } else {
            setError('Booking not found or payment not confirmed.');
            setPending(false);
          }
        }
      } catch (err) {
        setError('Failed to fetch booking.');
        setPending(false);
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
    return () => clearTimeout(timeout);
  }, [location]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner size="lg" /></div>;
  }
  if (pending) {
    return <div className="flex flex-col items-center justify-center min-h-screen text-blue-600 text-xl">Payment is processing...<br/>Please wait while we confirm your booking.</div>;
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
