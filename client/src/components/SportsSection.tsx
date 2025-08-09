import { motion } from 'framer-motion';
import { SportInfo } from '@/types';
import { useEffect, useState } from 'react';
import { getSlotPrices } from '@/lib/firebase';
import LoadingSpinner from './LoadingSpinner';

const sports: SportInfo[] = [
  {
    id: 'cricket',
    name: 'Cricket',
    icon: 'cricket',
    price: 900,
    description: 'Premium cricket turf (65x110 ft), floodlights, canteen, and speed meter add-on',
    color: 'primary',
  },
  {
    id: 'snooker',
    name: 'Snooker Table',
    icon: 'snooker',
    price: 600,
    description: 'Professional snooker table for casual and competitive play',
    color: 'secondary',
  },
  {
    id: 'pool',
    name: '8 Ball Pool',
    icon: 'pool',
    price: 500,
    description: '8 Ball Pool table with quality cues and balls',
    color: 'amber-600',
  },
  {
    id: 'airhockey',
    name: 'Air Hockey Table',
    icon: 'airhockey',
    price: 400,
    description: 'Fast-paced air hockey table for all ages',
    color: 'purple-600',
  },
];

// Custom SVG icons for each sport
const SportIcons = {
  cricket: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 sm:w-10 sm:h-10">
      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>
  ),
  snooker: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 sm:w-10 sm:h-10">
      <circle cx="12" cy="12" r="8"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  ),
  pool: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 sm:w-10 sm:h-10">
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2" fill="white"/>
      <circle cx="12" cy="12" r="0.8" fill="currentColor"/>
    </svg>
  ),
  airhockey: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 sm:w-10 sm:h-10">
      <rect x="2" y="2" width="20" height="20" rx="3" ry="3"/>
      <circle cx="7" cy="7" r="2" fill="white"/>
      <circle cx="17" cy="17" r="2" fill="white"/>
      <line x1="12" y1="2" x2="12" y2="22" stroke="white" strokeWidth="1.5"/>
      <line x1="2" y1="12" x2="22" y2="12" stroke="white" strokeWidth="1.5"/>
    </svg>
  ),
};

export default function SportsSection() {
  const [prices, setPrices] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      setLoading(true);
      try {
        const firestorePrices = await getSlotPrices();
        setPrices(firestorePrices);
      } catch (error) {
        setPrices(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPrices();
  }, []);

  const mergedSports = sports.map((sport) => ({
    ...sport,
    price: prices && prices[sport.id] ? prices[sport.id] : sport.price,
  }));

  return (
    <section id="sports" className="py-12 sm:py-24 bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-12 sm:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-4 sm:mb-6">
            <i className="fas fa-trophy text-xl sm:text-2xl text-primary"></i>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">Our Premium Facilities</h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
            Experience world-class sports facilities designed for both casual players and competitive athletes
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12 sm:py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {mergedSports.map((sport, index) => (
              <motion.div
                key={sport.id}
                className="group relative bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 sm:hover:-translate-y-4 border border-gray-100"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-50 to-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-500 to-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    {SportIcons[sport.icon as keyof typeof SportIcons]}
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 text-center group-hover:text-gray-800 transition-colors">
                    {sport.name}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-gray-600 mb-4 sm:mb-6 text-center leading-relaxed group-hover:text-gray-700 transition-colors text-sm sm:text-base">
                    {sport.description}
                  </p>
                  
                  {/* Price */}
                  <div className={`text-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-50 border border-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-100`}>
                    <div className={`text-xl sm:text-2xl font-bold text-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color}`}>
                      ₹{sport.price}
                    </div>
                    <div className={`text-xs sm:text-sm text-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color} font-medium`}>
                      per {sport.id === 'airhockey' ? 'hour' : 'hour'}
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="mt-4 sm:mt-6 space-y-1.5 sm:space-y-2">
                    {sport.id === 'cricket' && (
                      <>
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          <span className="text-green-500 mr-2 text-xs sm:text-sm">✓</span>
                          <span>65x110 ft Premium Turf</span>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          <span className="text-green-500 mr-2 text-xs sm:text-sm">✓</span>
                          <span>Professional Floodlights</span>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          <span className="text-green-500 mr-2 text-xs sm:text-sm">✓</span>
                          <span>Speed Meter Available <span className="text-primary font-semibold">(Paid Add-on)</span></span>
                        </div>
                      </>
                    )}
                    {sport.id === 'snooker' && (
                      <>
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          <span className="text-green-500 mr-2 text-xs sm:text-sm">✓</span>
                          <span>Professional Table</span>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          <span className="text-green-500 mr-2 text-xs sm:text-sm">✓</span>
                          <span>Quality Cues & Balls</span>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          <span className="text-green-500 mr-2 text-xs sm:text-sm">✓</span>
                          <span>Air Conditioned</span>
                        </div>
                      </>
                    )}
                    {sport.id === 'pool' && (
                      <>
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          <span className="text-green-500 mr-2 text-xs sm:text-sm">✓</span>
                          <span>8 Ball Pool Table</span>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          <span className="text-green-500 mr-2 text-xs sm:text-sm">✓</span>
                          <span>Professional Equipment</span>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          <span className="text-green-500 mr-2 text-xs sm:text-sm">✓</span>
                          <span>Comfortable Seating</span>
                        </div>
                      </>
                    )}
                    {sport.id === 'airhockey' && (
                      <>
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          <span className="text-green-500 mr-2 text-xs sm:text-sm">✓</span>
                          <span>Fast-Paced Action</span>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          <span className="text-green-500 mr-2 text-xs sm:text-sm">✓</span>
                          <span>1 hour Sessions</span>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-gray-600">
                          <span className="text-green-500 mr-2 text-xs sm:text-sm">✓</span>
                          <span>All Ages Welcome</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Book Now Button */}
                  <button 
                    onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}
                    className={`w-full mt-4 sm:mt-6 py-4 px-6 bg-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-500 hover:bg-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-600 text-white font-bold rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-lg flex items-center justify-center min-h-[48px]`}
                  >
                    <span className="mr-3 text-xl">📅</span>
                    <span className="whitespace-nowrap">Book Now</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        
        {/* Call to Action */}
        <motion.div
          className="text-center mt-12 sm:mt-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-white">
            <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Ready to Play?</h3>
            <p className="text-lg sm:text-xl mb-6 sm:mb-8 opacity-90">
              Book your preferred facility and start your game today!
            </p>
            <button 
              onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white text-primary px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <span className="mr-2">📅</span>
              Book Your Slot
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
