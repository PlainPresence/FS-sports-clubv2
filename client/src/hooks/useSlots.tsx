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
  status: 'available' | 'booked' | 'blocked' | 'confirmed';
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

  // Format hour to match Firebase format (e.g., "12" for 12, "01" for 1)
  const to12Hour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour.toString().padStart(2, '0')} AM`;
    if (hour === 12) return '12 PM';
    return `${(hour - 12).toString().padStart(2, '0')} PM`;
  };

  // Format time with minutes
  const formatTimeWithMinutes = (hour: number, minutes: number): string => {
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const formattedHour = displayHour.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${formattedHour}:${formattedMinutes} ${period}`;
  };

  // Convert time format to match Firebase format
  const convertTimeFormat = (timeSlot: string): string => {
    const [start, end] = timeSlot.split('-').map(t => t.trim());
    const startHour = parseInt(start.split(':')[0], 10);
    const endHour = parseInt(end.split(':')[0], 10);
    return `${to12Hour(startHour).split(' ')[0]}:00 ${to12Hour(startHour).split(' ')[1]} - ${to12Hour(endHour).split(' ')[0]}:00 ${to12Hour(endHour).split(' ')[1]}`;
  };

  // Generate all possible time slots based on sport type
  const generateAllSlots = () => {
    const allSlots: SlotInfo[] = [];
    const startHour = 0; // Midnight
    const endHour = 24; // End of day
    
    // Determine slot duration based on sport type
    console.log('🏒 SLOT GENERATION DEBUG:');
    console.log('Current sportType:', JSON.stringify(sportType));
    console.log('SportType type:', typeof sportType);
    
    const normalizedSportType = (sportType || '').toLowerCase().trim();
    console.log('Normalized sport type:', normalizedSportType);
    
    // More comprehensive Air Hockey detection
    const isAirHockey = normalizedSportType.includes('air hockey') || 
                       normalizedSportType.includes('airhockey') ||
                       normalizedSportType.includes('air_hockey') ||
                       normalizedSportType === 'air hockey table' ||
                       normalizedSportType.includes('hockey');
    
    console.log('🎯 Is Air Hockey?', isAirHockey);
    console.log('Will generate', isAirHockey ? '30-minute' : '60-minute', 'slots');
    
    if (isAirHockey) {
      // Generate 30-minute slots for Air Hockey
      console.log('🕐 Generating 30-minute Air Hockey slots...');
      for (let hour = startHour; hour < endHour; hour++) {
        // First 30-minute slot: XX:00 - XX:30
        const firstSlotStart = formatTimeWithMinutes(hour, 0);
        const firstSlotEnd = formatTimeWithMinutes(hour, 30);
        const firstSlotTime = `${firstSlotStart} - ${firstSlotEnd}`;
        
        allSlots.push({
          time: firstSlotTime,
          display: firstSlotTime,
          available: true,
          booked: false,
          blocked: false,
        });

        // Second 30-minute slot: XX:30 - (XX+1):00
        const secondSlotStart = formatTimeWithMinutes(hour, 30);
        const secondSlotEnd = formatTimeWithMinutes((hour + 1) % 24, 0);
        const secondSlotTime = `${secondSlotStart} - ${secondSlotEnd}`;
        
        allSlots.push({
          time: secondSlotTime,
          display: secondSlotTime,
          available: true,
          booked: false,
          blocked: false,
        });

        if (hour < 3) { // Only log first few for debugging
          console.log(`Generated Air Hockey slots - ${firstSlotTime} and ${secondSlotTime}`);
        }
      }
      console.log(`✅ Generated ${allSlots.length} total Air Hockey slots`);
    } else {
      // Generate 1-hour slots for other sports
      for (let hour = startHour; hour < endHour; hour++) {
        const nextHour = (hour + 1) % 24;
        
        // Exactly match Firebase format: "12:00 AM - 01:00 AM"
        const time = `${to12Hour(hour).split(' ')[0]}:00 ${to12Hour(hour).split(' ')[1]} - ${to12Hour(nextHour).split(' ')[0]}:00 ${to12Hour(nextHour).split(' ')[1]}`;
        const display = time; // Use the same format for display
        
        console.log(`Generated slot - time: ${time}`);
        
        allSlots.push({
          time,
          display,
          available: true,
          booked: false,
          blocked: false,
        });
      }
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
        console.log('Raw backend data:', data.slots);
        
        // Get booked and confirmed slots
        const bookedSlotsDisplay = (data.slots || [])
          .filter((slot: SlotAvailability) => {
            const isRelevantStatus = slot.status === 'booked' || slot.status === 'confirmed';
            const isMatchingDate = slot.date === date;
            const isMatchingSport = slot.sportType === sportType;
            console.log(`Slot ${slot.timeSlot}: status=${slot.status}, matchDate=${isMatchingDate}, matchSport=${isMatchingSport}`);
            return isRelevantStatus && isMatchingDate && isMatchingSport;
          })
          .map((slot: SlotAvailability) => slot.timeSlot);

        console.log('Booked slots to check:', bookedSlotsDisplay);

        const blockedSlotsDisplay = (data.slots || [])
          .filter((slot: SlotAvailability) => slot.status === 'blocked' && slot.date === date && slot.sportType === sportType)
          .map((slot: SlotAvailability) => slot.timeSlot);

        const allSlots = generateAllSlots();
        console.log('Generated all slots:', allSlots);
        
        const updatedSlots = allSlots.map(slot => {
          // Convert the backend time format to match our display format
          const backendFormat = slot.time; // e.g., "00:00-01:00"
          
          // Check if this slot is booked
          const isBooked = bookedSlotsDisplay.some((bookedSlot: string) => {
            console.log(`Comparing slot.time: ${slot.time} with bookedSlot: ${bookedSlot}`);
            return bookedSlot === slot.time;
          });
          
          // Check if this slot is blocked
          const isBlocked = blockedSlotsDisplay.some((blockedSlot: string) => 
            blockedSlot === slot.time
          );
          
          console.log(`Slot ${slot.display} (${slot.time}): isBooked=${isBooked}, isBlocked=${isBlocked}`);
          
          return {
            ...slot,
            booked: isBooked,
            blocked: isBlocked,
            available: !isBooked && !isBlocked,
          };
        });
        
        console.log('Final updated slots:', updatedSlots);
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
      console.log('Received slot update:', data);
      if (data.date === dateRef.current && data.sportType === sportTypeRef.current) {
        const updatedTimeSlot = convertTimeFormat(data.timeSlot);
        console.log('Updating slot:', updatedTimeSlot, 'Status:', data.status);
        
        setSlots(prevSlots => prevSlots.map(slot => {
          if (slot.display === updatedTimeSlot) {
            return {
              ...slot,
              booked: data.status === 'booked',
              blocked: data.status === 'blocked',
              available: data.status === 'available'
            };
          }
          return slot;
        }));
      }
    },
    onSlotBlocked: (data: any) => {
      if (data.date === dateRef.current && data.sportType === sportTypeRef.current) {
        const blockedTimeSlot = convertTimeFormat(data.timeSlot);
        setSlots(prevSlots => prevSlots.map(slot => {
          if (slot.display === blockedTimeSlot) {
            return {
              ...slot,
              blocked: true,
              available: false
            };
          }
          return slot;
        }));
      }
    },
    onSystemMessage: (data: any) => {
      console.log('System message received:', data);
    }
  });

  // Debug logging for sportType changes
  useEffect(() => {
    console.log('=== useSlots Hook Debug Info ===');
    console.log('Date:', date);
    console.log('SportType received:', JSON.stringify(sportType));
    console.log('SportType type:', typeof sportType);
    console.log('SportType length:', sportType?.length);
    console.log('================================');
  }, [date, sportType]);

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
