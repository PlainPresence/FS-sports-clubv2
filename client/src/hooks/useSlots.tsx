
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

export const useSlots = (date: string, sportType: string) => {

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

  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handler for real-time slot updates
  const handleSlotUpdate = (data: any) => {
    if (data.date === date && data.sportType === sportType) {
      console.log('Received slot update:', data);
      // Normalize backend bookedSlots to display format for comparison
      const bookedSlotsDisplay = (data.bookedSlots || []).map((slot: string) => {
        if (/AM|PM|am|pm/.test(slot)) return slot;
        const [start, end] = slot.split('-');
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
      setSlots(prevSlots => prevSlots.map(slot => {
        const isBooked = bookedSlotsDisplay.includes(slot.display);
        return {
          ...slot,
          booked: isBooked,
          available: !isBooked && !slot.blocked,
        };
      }));
    }
  };

  // Handler for slot availability update (if needed)
  const handleSlotAvailabilityUpdate = (data: any) => {
    if (data.date === date && data.sportType === sportType) {
      console.log('Received slot availability update:', data);
      setSlots(prevSlots => prevSlots.map(slot => {
        const slotData = data.timeSlots?.find((s: any) => {
          if (/AM|PM|am|pm/.test(s.timeSlot)) {
            return s.timeSlot === slot.display;
          } else {
            const [start, end] = s.timeSlot.split('-');
            const to12h = (t: string) => {
              const [h, m] = t.split(':');
              let hour = parseInt(h, 10);
              const ampm = hour >= 12 ? 'PM' : 'AM';
              hour = hour % 12;
              if (hour === 0) hour = 12;
              return `${hour.toString().padStart(2, '0')}:${m} ${ampm}`;
            };
            return `${to12h(start)} - ${to12h(end)}` === slot.display;
          }
        });
        if (slotData) {
          return {
            ...slot,
            booked: slotData.status === 'booked',
            blocked: slotData.status === 'blocked',
            available: slotData.status === 'available',
          };
        }
        return slot;
      }));
    }
  };

  // Attach handlers to WebSocket
  useWebSocket({
    onSlotUpdate: handleSlotUpdate,
    onSlotBlocked: handleSlotAvailabilityUpdate, // or use correct event if needed
    onSystemMessage: () => {},
  });

  // ...existing code...

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
}

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

  // Listen for real-time slot updates using useWebSocket's options
  useWebSocket({
    onSlotUpdate: (data: any) => {
      if (data.date === dateRef.current && data.sportType === sportTypeRef.current) {
        console.log('Received slot update:', data);
        // Normalize backend bookedSlots to display format for comparison
        const bookedSlotsDisplay = (data.bookedSlots || []).map((slot: string) => {
          if (/AM|PM|am|pm/.test(slot)) return slot;
          const [start, end] = slot.split('-');
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
        setSlots(slotsRef.current.map(slot => {
          const isBooked = bookedSlotsDisplay.includes(slot.display);
          return {
            ...slot,
            booked: isBooked,
            available: !isBooked && !slot.blocked,
          };
        }));
      }
    },
    onSlotBlocked: (data: any) => {
      // Optionally handle slot blocked events
    },
    onSystemMessage: (data: any) => {
      // Optionally handle system messages
    },
    // Add more handlers as needed
  });

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
