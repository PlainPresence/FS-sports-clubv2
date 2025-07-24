import { useState, useEffect } from 'react';
import { getAvailableSlots } from '@/lib/firebase';
import { TimeSlot } from '@/types';

const TIME_SLOTS = [
  { time: '06:00-07:00', display: '6:00 - 7:00 AM' },
  { time: '07:00-08:00', display: '7:00 - 8:00 AM' },
  { time: '08:00-09:00', display: '8:00 - 9:00 AM' },
  { time: '09:00-10:00', display: '9:00 - 10:00 AM' },
  { time: '10:00-11:00', display: '10:00 - 11:00 AM' },
  { time: '11:00-12:00', display: '11:00 AM - 12:00 PM' },
  { time: '14:00-15:00', display: '2:00 - 3:00 PM' },
  { time: '15:00-16:00', display: '3:00 - 4:00 PM' },
  { time: '16:00-17:00', display: '4:00 - 5:00 PM' },
  { time: '17:00-18:00', display: '5:00 - 6:00 PM' },
  { time: '18:00-19:00', display: '6:00 - 7:00 PM' },
  { time: '19:00-20:00', display: '7:00 - 8:00 PM' },
  { time: '20:00-21:00', display: '8:00 - 9:00 PM' },
  { time: '21:00-22:00', display: '9:00 - 10:00 PM' },
];

export const useSlots = (date: string, sportType: string) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date || !sportType) {
      setSlots([]);
      return;
    }

    const fetchSlots = async () => {
      setLoading(true);
      setError(null);
      try {
        const { bookedSlots, blockedSlots, isDateBlocked } = await getAvailableSlots(date, sportType);
        
        if (isDateBlocked) {
          setSlots([]);
          setError('This date is completely blocked');
          return;
        }

        const availableSlots = TIME_SLOTS.map(slot => ({
          ...slot,
          available: !bookedSlots.includes(slot.time) && !blockedSlots.includes(slot.time),
          booked: bookedSlots.includes(slot.time),
          blocked: blockedSlots.includes(slot.time),
        }));

        setSlots(availableSlots);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [date, sportType]);

  return {
    slots,
    loading,
    error,
  };
};
