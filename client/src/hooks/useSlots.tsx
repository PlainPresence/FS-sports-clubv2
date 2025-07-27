import { useState, useEffect } from 'react';
import { getAvailableSlots } from '@/lib/firebase';
import { TimeSlot } from '@/types';
import { useWebSocket } from './useWebSocket';

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
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // WebSocket integration for real-time updates
  const { isConnected, subscribeToSlots, unsubscribeFromSlots } = useWebSocket({
    onSlotUpdate: (data) => {
      if (data.date === date && data.sportType === sportType) {
        // Update slots with real-time data
        setSlots(prevSlots => {
          return prevSlots.map(slot => {
            const updatedSlot = data.slots.find((s: any) => s.time === slot.time);
            if (updatedSlot) {
              return {
                ...slot,
                available: updatedSlot.available,
                booked: updatedSlot.booked,
                blocked: updatedSlot.blocked
              };
            }
            return slot;
          });
        });
        setLastUpdate(new Date());
      }
    },
    onSlotBlocked: (data) => {
      if (data.date === date && data.sportType === sportType) {
        // Update blocked slots
        setSlots(prevSlots => {
          return prevSlots.map(slot => {
            if (data.blockedSlots.includes(slot.time)) {
              return { ...slot, blocked: true, available: false };
            }
            return slot;
          });
        });
        setLastUpdate(new Date());
      }
    }
  });

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
          setError('This date is completely blocked');
          setSlots([]);
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
        setLastUpdate(new Date());
      } catch (err: any) {
        setError(err.message || 'Failed to fetch slots');
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();

    // Subscribe to real-time updates via WebSocket only when connected
    if (isConnected) {
      subscribeToSlots(date, sportType);
    }

    // Cleanup subscription when date or sportType changes
    return () => {
      if (isConnected) {
        unsubscribeFromSlots(date, sportType);
      }
    };
  }, [date, sportType, isConnected, subscribeToSlots, unsubscribeFromSlots]);

  return {
    slots,
    loading,
    error,
    lastUpdate,
    isConnected
  };
};
