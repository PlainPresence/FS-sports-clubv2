import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
    };
  }
};

export const useSlots = (date: string, sportType: string) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const subscriptionRef = useRef<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);

  // Memoize the subscription key to prevent unnecessary re-renders
  const subscriptionKey = useMemo(() => `${date}-${sportType}`, [date, sportType]);

  // More aggressive throttled update function
  const throttledUpdate = useCallback((updateFn: () => void) => {
    const now = Date.now();
    if (now - lastUpdateTimeRef.current > 5000) { // Increased to 5 seconds minimum
      updateFn();
      lastUpdateTimeRef.current = now;
    }
  }, []);

  // WebSocket integration for real-time updates
  const { isConnected, subscribeToSlots, unsubscribeFromSlots } = useWebSocket({
    onSlotUpdate: (data) => {
      if (data.date === date && data.sportType === sportType) {
        // Only update if we have actual changes and enough time has passed
        throttledUpdate(() => {
          setSlots(prevSlots => {
            const updatedSlots = prevSlots.map(slot => {
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
            
            // Only update if there are actual changes
            const hasChanges = updatedSlots.some((slot, index) => {
              const prevSlot = prevSlots[index];
              return slot.available !== prevSlot.available || 
                     slot.booked !== prevSlot.booked || 
                     slot.blocked !== prevSlot.blocked;
            });
            
            return hasChanges ? updatedSlots : prevSlots;
          });
          setLastUpdate(new Date());
        });
      }
    },
    onSlotBlocked: (data) => {
      if (data.date === date && data.sportType === sportType) {
        // Only update if we have actual changes and enough time has passed
        throttledUpdate(() => {
          setSlots(prevSlots => {
            const updatedSlots = prevSlots.map(slot => {
              if (data.blockedSlots.includes(slot.time)) {
                return { ...slot, blocked: true, available: false };
              }
              return slot;
            });
            
            // Only update if there are actual changes
            const hasChanges = updatedSlots.some((slot, index) => {
              const prevSlot = prevSlots[index];
              return slot.available !== prevSlot.available || 
                     slot.booked !== prevSlot.booked || 
                     slot.blocked !== prevSlot.blocked;
            });
            
            return hasChanges ? updatedSlots : prevSlots;
          });
          setLastUpdate(new Date());
        });
      }
    }
  });

  // Initial data fetch - only run once per date/sportType combination
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
        isInitializedRef.current = true;
      } catch (err: any) {
        setError(err.message || 'Failed to fetch slots');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if not already initialized for this combination
    if (!isInitializedRef.current || subscriptionRef.current !== subscriptionKey) {
      fetchSlots();
    }

    // WebSocket subscription management
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      // Only subscribe if not already subscribed to this combination
      if (isConnected && subscriptionRef.current !== subscriptionKey) {
        if (subscriptionRef.current) {
          // Unsubscribe from previous
          const [prevDate, prevSport] = subscriptionRef.current.split('-');
          unsubscribeFromSlots(prevDate, prevSport);
        }
        
        // Subscribe to new
        subscribeToSlots(date, sportType);
        subscriptionRef.current = subscriptionKey;
      }
    }, 2000); // Increased debounce to 2 seconds

    // Cleanup subscription when date or sportType changes
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (isConnected && subscriptionRef.current) {
        const [prevDate, prevSport] = subscriptionRef.current.split('-');
        unsubscribeFromSlots(prevDate, prevSport);
        subscriptionRef.current = null;
      }
    };
  }, [date, sportType, isConnected, subscribeToSlots, unsubscribeFromSlots, subscriptionKey]);

  return {
    slots,
    loading,
    error,
    lastUpdate,
    isConnected
  };
};
