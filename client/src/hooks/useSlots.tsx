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
  const { socket } = useWebSocket();

  // Generate all possible time slots
  const generateAllSlots = () => {
    const allSlots: SlotInfo[] = [];
    const startHour = 0; // Midnight
    const endHour = 24; // End of day
    
    for (let hour = startHour; hour < endHour; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`;
      const display = `${hour}:00 - ${hour + 1}:00`;
      
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
        const availabilityMap = new Map();
        data.slots.forEach((slot: SlotAvailability) => {
          availabilityMap.set(slot.timeSlot, slot.status);
        });
        
        const allSlots = generateAllSlots();
        const updatedSlots = allSlots.map(slot => ({
          ...slot,
          booked: availabilityMap.get(slot.time) === 'booked',
          blocked: availabilityMap.get(slot.time) === 'blocked',
          available: !availabilityMap.has(slot.time) || availabilityMap.get(slot.time) === 'available',
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
    if (!socket) return;

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

    socket.on('slot_update', handleSlotUpdate);
    socket.on('slot_availability_update', handleSlotAvailabilityUpdate);

    return () => {
      socket.off('slot_update', handleSlotUpdate);
      socket.off('slot_availability_update', handleSlotAvailabilityUpdate);
    };
  }, [socket, date, sportType]);

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
