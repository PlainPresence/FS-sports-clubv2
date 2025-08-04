import { useState, useEffect, useCallback } from 'react';
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
  const webSocket = useWebSocket();

  // Generate all possible time slots
  const generateAllSlots = () => {
    const allSlots: SlotInfo[] = [];
    const startHour = 0; // Midnight
    const endHour = 24; // End of day
    
    function formatSlot(hour: number) {
      const start = new Date(0, 0, 0, hour, 0, 0);
      const end = new Date(0, 0, 0, hour + 1, 0, 0);
      const options = { hour: 'numeric', minute: '2-digit', hour12: true } as const;
      return `${start.toLocaleTimeString([], options)} - ${end.toLocaleTimeString([], options)}`;
    }
    for (let hour = startHour; hour < endHour; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`;
      const display = formatSlot(hour);
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
          .map((slot: SlotAvailability) => {
            // Convert slot.timeSlot (e.g. '00:00-01:00') to display format
            const [start, end] = slot.timeSlot.split('-');
            const to12h = (t: string) => {
              const [h, m] = t.split(':');
              let hour = parseInt(h, 10);
              const ampm = hour >= 12 ? 'PM' : 'AM';
              hour = hour % 12;
              if (hour === 0) hour = 12;
              return `${hour.toString().padStart(2, '0')}:${m} ${ampm}`;
            };
            return `${to12h(start)} - ${to12h(end)}`;
          });
        const blockedSlotsDisplay = (data.slots || [])
          .filter((slot: SlotAvailability) => slot.status === 'blocked')
          .map((slot: SlotAvailability) => {
            const [start, end] = slot.timeSlot.split('-');
            const to12h = (t: string) => {
              const [h, m] = t.split(':');
              let hour = parseInt(h, 10);
              const ampm = hour >= 12 ? 'PM' : 'AM';
              hour = hour % 12;
              if (hour === 0) hour = 12;
              return `${hour.toString().padStart(2, '0')}:${m} ${ampm}`;
            };
            return `${to12h(start)} - ${to12h(end)}`;
          });
        const allSlots = generateAllSlots();
        const updatedSlots = allSlots.map(slot => ({
          ...slot,
          booked: bookedSlotsDisplay.includes(slot.display),
          blocked: blockedSlotsDisplay.includes(slot.display),
          available: !bookedSlotsDisplay.includes(slot.display) && !blockedSlotsDisplay.includes(slot.display),
        }));
        setSlots(updatedSlots);
      } else {
        setError(data.error || 'Failed to fetch slot availability');
      }
    } catch (err) {
      setError('Failed to fetch slot availability');
    } finally {
      setLoading(false);
    }
  };

  // Listen for real-time slot updates
  useEffect(() => {
    // If your useWebSocket hook exposes an 'on' and 'off' method for events:
    if (!webSocket || typeof webSocket.on !== 'function' || typeof webSocket.off !== 'function') return;

    const handleSlotUpdate = (data: any) => {
      if (data.date === date && data.sportType === sportType) {
        console.log('Received slot update:', data);
        // Update slots based on real-time data
        setSlots(prevSlots => 
          prevSlots.map(slot => {
            const isBooked = data.bookedSlots?.includes(slot.time) || false;
            return {
              ...slot,
              booked: isBooked,
              available: !isBooked && !slot.blocked,
            };
          })
        );
      }
    };

    const handleSlotAvailabilityUpdate = (data: any) => {
      if (data.date === date && data.sportType === sportType) {
        console.log('Received slot availability update:', data);
        setSlots(prevSlots => 
          prevSlots.map(slot => {
            const slotData = data.timeSlots?.find((s: any) => s.timeSlot === slot.time);
            if (slotData) {
              return {
                ...slot,
                booked: slotData.status === 'booked',
                blocked: slotData.status === 'blocked',
                available: slotData.status === 'available',
              };
            }
            return slot;
          })
        );
      }
    };

    webSocket.on('slot_update', handleSlotUpdate);
    webSocket.on('slot_availability_update', handleSlotAvailabilityUpdate);

    return () => {
      webSocket.off('slot_update', handleSlotUpdate);
      webSocket.off('slot_availability_update', handleSlotAvailabilityUpdate);
    };
  }, [webSocket, date, sportType]);

  // Fetch slots when date or sportType changes
  useEffect(() => {
    if (date && sportType) {
      fetchSlotAvailability();
    }
  }, [date, sportType]);

  // Expose refetch function for external use
  const refetchSlots = useCallback(() => {
    if (date && sportType) {
      console.log('Refetching slots for:', date, sportType);
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
