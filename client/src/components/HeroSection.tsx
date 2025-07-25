import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface HeroSectionProps {
  onBookNowClick: () => void;
}

export default function HeroSection({ onBookNowClick }: HeroSectionProps) {
  // Slideshow images
  const images = [
    "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80",
    "https://images.unsplash.com/photo-1464983953574-0892a716854b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
  ];
  const [bgIndex, setBgIndex] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setBgIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [bgIndex]);

  return (
    <section id="home" className="relative min-h-[320px] sm:min-h-screen flex items-center justify-center overflow-hidden pt-20 sm:pt-32">
      {/* Slideshow backgrounds */}
      {images.map((img, idx) => (
        <div
          key={img}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${bgIndex === idx ? 'opacity-100 z-0' : 'opacity-0 z-0'}`}
          style={{ backgroundImage: `url('${img}')` }}
        />
      ))}
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black bg-opacity-60 z-0" />
      <div className="relative z-10 max-w-4xl mx-auto px-2 sm:px-4 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            Premium Multi-Sport
            <span className="block text-primary">Turf Experience</span>
          </h1>
          <p className="text-base sm:text-lg md:text-2xl text-gray-200 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed">
            State-of-the-art facilities for Cricket, Football, Badminton & more. Book your perfect playing time with instant confirmation.
          </p>
        </motion.div>
        {/* Key Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <motion.div 
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <i className="fas fa-clock text-white text-lg sm:text-xl"></i>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">24/7 Booking</h3>
            <p className="text-gray-200 text-xs sm:text-sm">Book anytime, anywhere with instant confirmation</p>
          </motion.div>

          <motion.div 
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <i className="fas fa-shield-alt text-white text-lg sm:text-xl"></i>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Secure Payments</h3>
            <p className="text-gray-200 text-xs sm:text-sm">Safe & secure online payments with Razorpay</p>
          </motion.div>

          <motion.div 
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <i className="fas fa-trophy text-white text-lg sm:text-xl"></i>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">Pro Facilities</h3>
            <p className="text-gray-200 text-xs sm:text-sm">Professional-grade equipment and surfaces</p>
          </motion.div>
        </div>
        <motion.button 
          onClick={onBookNowClick}
          className="bg-primary hover:bg-primary-dark text-white px-8 sm:px-12 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Book Your Slot Now
          <i className="fas fa-arrow-right ml-2"></i>
        </motion.button>
      </div>
      {/* Animated scroll-down indicator */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center">
        <span className="text-white text-xs mb-1 animate-pulse">Scroll Down</span>
        <svg className="w-6 h-6 text-white animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
