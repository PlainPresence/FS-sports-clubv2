import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getAvailableSlots } from '@/lib/firebase';
import Shimmer from './Shimmer';

interface SlotPreview {
  time: string;
  sport: string;
  available: boolean;
}

export default function UpcomingSlots() {
  const [slots, setSlots] = useState<SlotPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodaySlots = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const sports = ['cricket', 'football', 'badminton', 'basketball'];
        
        const allSlots: SlotPreview[] = [];
        
        for (const sport of sports) {
          const { bookedSlots, blockedSlots, isDateBlocked } = await getAvailableSlots(today, sport);
          
          if (!isDateBlocked) {
            const timeSlots = ['06:00-07:00', '07:00-08:00', '17:00-18:00', '18:00-19:00', '19:00-20:00'];
            
            timeSlots.forEach(timeSlot => {
              const isAvailable = !bookedSlots.includes(timeSlot) && !blockedSlots.includes(timeSlot);
              if (isAvailable && allSlots.length < 6) {
                allSlots.push({
                  time: timeSlot.replace('-', ' - ').replace(':', ':00').replace(/(\d{2}):00/g, (match, hour) => {
                    const h = parseInt(hour);
                    return `${h > 12 ? h - 12 : h || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
                  }),
                  sport: sport.charAt(0).toUpperCase() + sport.slice(1),
                  available: true,
                });
              }
            });
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
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Available Today</h2>
          <p className="text-lg text-gray-600">Quick book popular time slots</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Shimmer key={index} className="h-20 rounded-xl" />
            ))
          ) : (
            slots.map((slot, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-xl p-4 text-center border-2 border-gray-200 hover:border-primary transition-colors cursor-pointer group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="text-lg font-bold text-gray-900 group-hover:text-primary">
                  {slot.time.split(' - ')[0]}
                </div>
                <div className="text-sm text-gray-500">{slot.sport}</div>
                <div className="text-xs text-primary font-semibold mt-2">Available</div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
