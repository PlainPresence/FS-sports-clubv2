import { motion } from 'framer-motion';
import { SportInfo } from '@/types';
import { useEffect, useState } from 'react';
import { getSlotPrices } from '@/lib/firebase';
import LoadingSpinner from './LoadingSpinner';

const sports: SportInfo[] = [
  {
    id: 'cricket',
    name: 'Cricket',
    icon: 'fas fa-baseball-ball',
    price: 900,
    description: 'Premium cricket turf (65x110 ft), floodlights, canteen, and speed meter add-on',
    color: 'primary',
  },
  {
    id: 'snooker',
    name: 'Snooker Table',
    icon: 'fas fa-billiards',
    price: 600,
    description: 'Professional snooker table for casual and competitive play',
    color: 'secondary',
  },
  {
    id: 'pool',
    name: '8 Ball Pool',
    icon: 'fas fa-pool-table',
    price: 500,
    description: '8 Ball Pool table with quality cues and balls',
    color: 'amber-600',
  },
  {
    id: 'airhockey',
    name: 'Air Hockey Table',
    icon: 'fas fa-hockey-puck',
    price: 400,
    description: 'Fast-paced air hockey table for all ages',
    color: 'purple-600',
  },
];

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
    <section id="sports" className="py-24 bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
            <i className="fas fa-trophy text-2xl text-primary"></i>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Our Premium Facilities</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience world-class sports facilities designed for both casual players and competitive athletes
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {mergedSports.map((sport, index) => (
              <motion.div
                key={sport.id}
                className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 border border-gray-100"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br from-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-50 to-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-20 h-20 bg-gradient-to-br from-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-500 to-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <i className={`${sport.icon} text-3xl text-white`}></i>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center group-hover:text-gray-800 transition-colors">
                    {sport.name}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-gray-600 mb-6 text-center leading-relaxed group-hover:text-gray-700 transition-colors">
                    {sport.description}
                  </p>
                  
                  {/* Price */}
                  <div className={`text-center p-4 rounded-2xl bg-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-50 border border-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-100`}>
                    <div className={`text-2xl font-bold text-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color}`}>
                      ₹{sport.price}
                    </div>
                    <div className={`text-sm text-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color} font-medium`}>
                      per {sport.id === 'airhockey' ? '30 min' : 'hour'}
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="mt-6 space-y-2">
                    {sport.id === 'cricket' && (
                      <>
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span>65x110 ft Premium Turf</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span>Professional Floodlights</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span>Speed Meter Available</span>
                        </div>
                      </>
                    )}
                    {sport.id === 'snooker' && (
                      <>
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span>Professional Table</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span>Quality Cues & Balls</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span>Air Conditioned</span>
                        </div>
                      </>
                    )}
                    {sport.id === 'pool' && (
                      <>
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span>8 Ball Pool Table</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span>Professional Equipment</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span>Comfortable Seating</span>
                        </div>
                      </>
                    )}
                    {sport.id === 'airhockey' && (
                      <>
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span>Fast-Paced Action</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span>30-Minute Sessions</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-check text-green-500 mr-2"></i>
                          <span>All Ages Welcome</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Book Now Button */}
                  <button 
                    onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}
                    className={`w-full mt-6 py-3 px-4 bg-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-500 hover:bg-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl`}
                  >
                    <i className="fas fa-calendar-check mr-2"></i>
                    Book Now
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        
        {/* Call to Action */}
        <motion.div
          className="text-center mt-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="bg-gradient-to-r from-primary to-secondary rounded-3xl p-12 text-white">
            <h3 className="text-3xl font-bold mb-4">Ready to Play?</h3>
            <p className="text-xl mb-8 opacity-90">
              Book your preferred facility and start your game today!
            </p>
            <button 
              onClick={() => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white text-primary px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <i className="fas fa-calendar-check mr-2"></i>
              Book Your Slot
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
