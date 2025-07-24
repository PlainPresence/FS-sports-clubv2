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
    price: 800,
    description: 'Professional cricket pitch with premium facilities',
    color: 'primary',
  },
  {
    id: 'football',
    name: 'Football',
    icon: 'fas fa-futbol',
    price: 1000,
    description: 'FIFA-standard football turf for competitive play',
    color: 'secondary',
  },
  {
    id: 'badminton',
    name: 'Badminton',
    icon: 'fas fa-table-tennis',
    price: 600,
    description: 'Indoor badminton courts with proper ventilation',
    color: 'amber-600',
  },
  {
    id: 'basketball',
    name: 'Basketball',
    icon: 'fas fa-basketball-ball',
    price: 700,
    description: 'Full-size basketball court with premium hoops',
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
    <section id="sports" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Available Sports</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose from our wide range of sports facilities, each designed for optimal performance
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {mergedSports.map((sport, index) => (
              <motion.div
                key={sport.id}
                className={`group bg-gray-50 rounded-2xl p-8 text-center hover:bg-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
              >
                <div className={`w-20 h-20 bg-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color.split('-')[0]}-200 transition-colors`}>
                  <i className={`${sport.icon} text-3xl text-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color}`}></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{sport.name}</h3>
                <p className="text-gray-600 mb-4">{sport.description}</p>
                <div className={`text-sm text-${sport.color === 'primary' ? 'primary' : sport.color === 'secondary' ? 'secondary' : sport.color} font-semibold`}>
                  ₹{sport.price}/hour
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
