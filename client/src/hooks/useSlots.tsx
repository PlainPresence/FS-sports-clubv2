import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

export interface SlotInfo {
  time: string;
  display: string;
  available: boolean;
  booked: boolean;
  blocked: boolean;
}

export interface SlotAvailability {
  date: string;
  sportType: string;
  timeSlot: string;
  status: 'available' | 'booked' | 'blocked';
  bookingId?: string;
  lastUpdated: string;
}

export const useSlots = (date: string, sportType: string) => {
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const slotsRef = useRef<SlotInfo[]>([]);
  const dateRef = useRef(date);
  const sportTypeRef = useRef(sportType);

  // Keep refs up to date
  useEffect(() => {
    dateRef.current = date;
    sportTypeRef.current = sportType;
  }, [date, sportType]);

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  // Consistent time format conversion
  const to12Hour = (hour: number): string => {
    if (hour === 0) return '12:00 AM';
    if (hour < 12) return `${hour}:00 AM`;
    if (hour === 12) return '12:00 PM';
    return `${hour - 12}:00 PM`;
  };

  // Convert 24-hour format to 12-hour display format
  const convertTimeFormat = (timeSlot: string): string => {
    const [start, end] = timeSlot.split('-').map(t => t.trim());
    const startHour = parseInt(start.split(':')[0], 10);
    const endHour = parseInt(end.split(':')[0], 10);
    return `${to12Hour(startHour)} - ${to12Hour(endHour)}`;
  };

  // Generate all possible time slots
  const generateAllSlots = () => {
    const allSlots: SlotInfo[] = [];
    const startHour = 0; // Midnight
    const endHour = 24; // End of day

    for (let hour = startHour; hour < endHour; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`;
      const display = `${to12Hour(hour)} - ${to12Hour((hour + 1) % 24)}`;
      allSlots.push({
        time,
        display,
        available: true,
        booked: false,
        blocked: false,
      });
    }
    return allSlots;
  };

  // Fetch slot availability from backend
  const fetchSlotAvailability = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/slots/availability?date=${date}&sportType=${sportType}`);
      const data = await response.json();
      if (data.success) {
        // Collect booked and blocked slots in display format for comparison
        const bookedSlotsDisplay = (data.slots || [])
          .filter((slot: SlotAvailability) => slot.status === 'booked')
          .map((slot: SlotAvailability) => convertTimeFormat(slot.timeSlot));

        const blockedSlotsDisplay = (data.slots || [])
          .filter((slot: SlotAvailability) => slot.status === 'blocked')
          .map((slot: SlotAvailability) => convertTimeFormat(slot.timeSlot));

        console.log('Booked slots:', bookedSlotsDisplay);
        console.log('Blocked slots:', blockedSlotsDisplay);

        const allSlots = generateAllSlots();
        const updatedSlots = allSlots.map(slot => ({
          ...slot,
          booked: bookedSlotsDisplay.includes(slot.display),
          blocked: blockedSlotsDisplay.includes(slot.display),
          available: !bookedSlotsDisplay.includes(slot.display) && !blockedSlotsDisplay.includes(slot.display),
        }));

        console.log('Updated slots:', updatedSlots);
        setSlots(updatedSlots);
      } else {
        setError(data.error || 'Failed to fetch slot availability');
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
      setError('Failed to fetch slot availability');
    } finally {
      setLoading(false);
    }
  };

  // Listen for real-time slot updates using useWebSocket's options
  useWebSocket({
    onSlotUpdate: (data: any) => {
      if (data.date === dateRef.current && data.sportType === sportTypeRef.current) {
        console.log('Received slot update:', data);
        
        // Normalize backend bookedSlots to display format for comparison
        const bookedSlotsDisplay = (data.bookedSlots || []).map((slot: string) => {
          if (/AM|PM/.test(slot)) return slot;
          return convertTimeFormat(slot);
        });

        console.log('Normalized booked slots:', bookedSlotsDisplay);

        setSlots(slotsRef.current.map(slot => {
          const isBooked = bookedSlotsDisplay.includes(slot.display);
          console.log(`Slot ${slot.display}: isBooked=${isBooked}`);
          return {
            ...slot,
            booked: isBooked,
            available: !isBooked && !slot.blocked,
          };
        }));
      }
    },
    onSlotBlocked: (data: any) => {
      if (data.date === dateRef.current && data.sportType === sportTypeRef.current) {
        fetchSlotAvailability(); // Refetch all slots to get the latest status
      }
    },
    onSystemMessage: (data: any) => {
      // Handle system messages if needed
    },
  });

  // Fetch slots when date or sportType changes
  useEffect(() => {
    if (date && sportType) {
      console.log(`Fetching slots for date: ${date}, sport: ${sportType}`);
      fetchSlotAvailability();
    }
  }, [date, sportType]);

  // Expose refetch function for external use
  const refetchSlots = useCallback(() => {
    if (date && sportType) {
      console.log('Manually refetching slots for:', date, sportType);
      fetchSlotAvailability();
    }
  }, [date, sportType]);

  return {
    slots,
    loading,
    error,
    refetch: refetchSlots,
  };
};
