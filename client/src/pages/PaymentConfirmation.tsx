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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Safe URL parameter extraction
    const getOrderId = (): string | null => {
      try {
        if (typeof window === 'undefined' || !window.location) {
          return null;
        }
        
        const search = window.location.search || '';
        const params = new URLSearchParams(search);
        return params.get('orderId') || params.get('order_id');
      } catch (err) {
        console.error('Error parsing URL parameters:', err);
        return null;
      }
    };

    const orderId = getOrderId();
    
    if (!orderId) {
      if (isMountedRef.current) {
        setError('Missing order ID in URL.');
        setLoading(false);
      }
      return;
    }

    const fetchBooking = async (): Promise<void> => {
      if (!isMountedRef.current) return;

      setLoading(true);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const res = await fetch(`/api/booking/by-cashfree-order?orderId=${encodeURIComponent(orderId)}`, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!isMountedRef.current) return;

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (!isMountedRef.current) return;

        if (data?.success && data?.booking) {
          setBookingData(data.booking);
          setPending(false);
          setError(null);
        } else {
          handleRetry();
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;

        console.error('Fetch error:', err);

        if (err.name === 'AbortError') {
          console.log('Request was aborted');
          return;
        }

        handleRetry();
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    const handleRetry = (): void => {
      if (!isMountedRef.current) return;

      if (retries.current < maxRetries) {
        setPending(true);
        retries.current += 1;
        
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            fetchBooking();
          }
        }, 3000);
      } else {
        setError('Booking not found or payment not confirmed. Please contact support.');
        setPending(false);
      }
    };

    // Initial fetch
    fetchBooking();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []); // Remove location dependency to prevent unnecessary re-renders

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  if (loading && !pending) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (pending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-blue-600 text-xl text-center">
        <LoadingSpinner size="lg" />
        <div className="mt-4">
          Payment is processing...<br />
          Please wait while we confirm your booking.
          <div className="text-sm text-gray-500 mt-2">
            Attempt {retries.current} of {maxRetries}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-800 mb-4">Payment Confirmation Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mr-2"
          >
            Try Again
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Go Home
          </button>
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
      onBookAnother={() => {
        try {
          window.location.href = '/';
        } catch (err) {
          console.error('Navigation error:', err);
          window.location.reload();
        }
      }} 
    />
  );
}
