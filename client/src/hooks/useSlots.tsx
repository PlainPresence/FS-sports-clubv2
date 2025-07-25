import { useState, useEffect } from 'react';
import { getAvailableSlots } from '@/lib/firebase';
import { TimeSlot } from '@/types';

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const startHour = i;
  const endHour = (i + 1) % 24;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const start = `${pad(startHour)}:00`;
  const end = `${pad(endHour)}:00`;
  // Format for display
  const format = (h: number) => {
    const hour = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hour}:00 ${ampm}`;
  };
  return {
    time: `${start}-${end}`,
    display: `${format(startHour)} - ${format(endHour)}`,
  };
});

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
