import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getAvailableSlots } from '@/lib/firebase';
import Shimmer from './Shimmer';

interface SlotPreview {
  time: string;
  sport: string;
  available: boolean;
  isPopular?: boolean;
}

export default function UpcomingSlots() {
  const [slots, setSlots] = useState<SlotPreview[]>([]);
  const [loading, setLoading] = useState(true);

  // Popular time slots - 1 hour each
  const popularTimeSlots = [
    '21:00-22:00', // 9 PM - 10 PM
    '22:00-23:00', // 10 PM - 11 PM
    '23:00-00:00', // 11 PM - 12 AM
    '00:00-01:00', // 12 AM - 1 AM
    '01:00-02:00', // 1 AM - 2 AM
    '02:00-03:00', // 2 AM - 3 AM
  ];

  useEffect(() => {
    const fetchTodaySlots = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const sports = ['cricket', 'snooker', 'pool', 'airhockey'];
        
        const allSlots: SlotPreview[] = [];
        
        for (const sport of sports) {
          const { bookedSlots, blockedSlots, isDateBlocked } = await getAvailableSlots(today, sport);
          
          if (!isDateBlocked) {
            // Focus on popular time slots first
            popularTimeSlots.forEach(timeSlot => {
              const isAvailable = !bookedSlots.includes(timeSlot) && !blockedSlots.includes(timeSlot);
              if (isAvailable && allSlots.length < 6) {
                allSlots.push({
                  time: formatTimeRange(timeSlot),
                  sport: sport.charAt(0).toUpperCase() + sport.slice(1),
                  available: true,
                  isPopular: true,
                });
              }
            });

            // Add some regular slots if we have space
            if (allSlots.length < 6) {
              const regularTimeSlots = ['18:00-19:00', '19:00-20:00', '20:00-21:00'];
              regularTimeSlots.forEach(timeSlot => {
                const isAvailable = !bookedSlots.includes(timeSlot) && !blockedSlots.includes(timeSlot);
                if (isAvailable && allSlots.length < 6) {
                  allSlots.push({
                    time: formatTimeRange(timeSlot),
                    sport: sport.charAt(0).toUpperCase() + sport.slice(1),
                    available: true,
                    isPopular: false,
                  });
                }
              });
            }
          }
        }
        
        setSlots(allSlots);
      } catch (error) {
        console.error('Error fetching slots:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodaySlots();
  }, []);

  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Popular Time Slots</h2>
          <p className="text-lg text-gray-600">Book the most sought-after evening and night slots</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Shimmer key={index} className="h-24 rounded-xl" />
            ))
          ) : (
            slots.map((slot, index) => (
              <motion.div
                key={index}
                className={`rounded-xl p-4 text-center border-2 transition-all duration-300 cursor-pointer group ${
                  slot.isPopular 
                    ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 hover:border-primary hover:shadow-lg hover:shadow-primary/20' 
                    : 'bg-white border-gray-200 hover:border-primary'
                }`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
                onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <div className={`text-sm font-bold group-hover:text-primary ${
                  slot.isPopular ? 'text-primary' : 'text-gray-900'
                }`}>
                  {slot.time}
                </div>
                <div className="text-xs text-gray-500 mb-1">{slot.sport}</div>
                {slot.isPopular ? (
                  <div className="flex items-center justify-center space-x-1">
                    <span className="text-xs text-primary font-semibold">🔥 Popular</span>
                  </div>
                ) : (
                  <div className="text-xs text-green-600 font-semibold">Available</div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Popular Times Info */}
        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Most Popular Times</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-gray-700 font-medium">9 PM - 11 PM</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-gray-700 font-medium">11 PM - 1 AM</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-gray-700 font-medium">1 AM - 3 AM</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              These are our most popular slots - perfect for night owls and late-night sports enthusiasts!
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function formatTimeRange(timeSlot: string) {
  // timeSlot is like '21:00-22:00'
  const [start, end] = timeSlot.split('-');
  
  const formatTime = (time: string) => {
    let [hour, minute] = time.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    let displayHour = hour % 12;
    if (displayHour === 0) displayHour = 12;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };
  
  return `${formatTime(start)} - ${formatTime(end)}`;
}
