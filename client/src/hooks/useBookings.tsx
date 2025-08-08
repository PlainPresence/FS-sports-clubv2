import { useState, useEffect } from 'react';
import { getBookings } from '@/lib/firebase';
import { BookingData } from '@/types';

interface UseBookingsProps {
  dateFilter?: string;
  searchFilter?: string;
}

export const useBookings = ({ dateFilter, searchFilter }: UseBookingsProps = {}) => {
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedBookings = await getBookings({
        date: dateFilter,
        search: searchFilter,
      });
      setBookings(fetchedBookings);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [dateFilter, searchFilter]);

  return {
    bookings,
    loading,
    error,
    refetch: fetchBookings,
  };
};
