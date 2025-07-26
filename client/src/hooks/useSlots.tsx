import { useState, useEffect } from 'react';
import { getAvailableSlots } from '@/lib/firebase';
import { TimeSlot } from '@/types';

// Generate time slots based on sport type
const generateTimeSlots = (sportType: string) => {
  if (sportType === 'airhockey') {
    // Generate 30-minute slots for air hockey
    return Array.from({ length: 48 }, (_, i) => {
      const startHour = Math.floor(i / 2);
      const startMinute = (i % 2) * 30;
      const endHour = Math.floor((i + 1) / 2);
      const endMinute = ((i + 1) % 2) * 30;
      
      const pad = (n: number) => n.toString().padStart(2, '0');
      const start = `${pad(startHour)}:${pad(startMinute)}`;
      const end = `${pad(endHour)}:${pad(endMinute)}`;
      
      // Format for display
      const format = (h: number, m: number) => {
        const hour = h % 12 === 0 ? 12 : h % 12;
        const ampm = h < 12 ? 'AM' : 'PM';
        return `${hour}:${pad(m)} ${ampm}`;
      };
      
      return {
        time: `${start}-${end}`,
        display: `${format(startHour, startMinute)} - ${format(endHour, endMinute)}`,
      };
    });
  } else {
    // Generate 1-hour slots for other sports
    return Array.from({ length: 24 }, (_, i) => {
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
  }
};

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

        const timeSlots = generateTimeSlots(sportType);
        const availableSlots = timeSlots.map(slot => ({
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
