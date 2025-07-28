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
      {/* Enhanced overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70 z-0" />
      
      {/* Floating elements for visual interest */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-secondary/20 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-red-500/20 rounded-full blur-xl"></div>
      </div>
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-12"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6"
          >
            <i className="fas fa-star text-yellow-400 mr-2"></i>
            <span className="text-white text-sm font-medium">Premium Sports Facility</span>
          </motion.div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 sm:mb-8 leading-tight">
            <span className="block">Premium Multi-Sport</span>
            <span className="block bg-gradient-to-r from-primary via-secondary to-red-500 bg-clip-text text-transparent">
              Turf Experience
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-gray-200 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            Experience world-class facilities for Cricket, Snooker, 8 Ball Pool & Air Hockey. 
            <span className="block mt-2">Book your perfect playing time with instant confirmation and secure payments.</span>
          </p>
        </motion.div>
        
        {/* Enhanced Key Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <motion.div 
            className="group bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <i className="fas fa-clock text-white text-xl"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">24/7 Booking</h3>
            <p className="text-gray-300 text-sm leading-relaxed">Book anytime, anywhere with instant confirmation and real-time availability</p>
          </motion.div>

          <motion.div 
            className="group bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="w-14 h-14 bg-gradient-to-br from-secondary to-secondary/80 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <i className="fas fa-shield-alt text-white text-xl"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Secure Payments</h3>
            <p className="text-gray-300 text-sm leading-relaxed">Safe & secure online payments with Cashfree integration</p>
          </motion.div>

          <motion.div 
            className="group bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <i className="fas fa-trophy text-white text-xl"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Pro Facilities</h3>
            <p className="text-gray-300 text-sm leading-relaxed">Professional-grade equipment and premium playing surfaces</p>
          </motion.div>

          <motion.div 
            className="group bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <i className="fas fa-whatsapp text-white text-xl"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Instant Updates</h3>
            <p className="text-gray-300 text-sm leading-relaxed">WhatsApp confirmations and real-time booking updates</p>
          </motion.div>
        </div>
        
        {/* Enhanced CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <button 
            onClick={onBookNowClick}
            className="group bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white px-8 sm:px-12 py-4 sm:py-5 rounded-2xl text-lg sm:text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-primary/25 focus:outline-none focus:ring-4 focus:ring-primary/30"
          >
            <i className="fas fa-calendar-check mr-3 group-hover:rotate-12 transition-transform duration-300"></i>
            Book Your Slot Now
          </button>
          
          <button 
            onClick={() => document.getElementById('sports')?.scrollIntoView({ behavior: 'smooth' })}
            className="group bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-8 sm:px-12 py-4 sm:py-5 rounded-2xl text-lg sm:text-xl font-semibold border-2 border-white/30 hover:border-white/50 transition-all duration-300 transform hover:scale-105"
          >
            <i className="fas fa-trophy mr-3 group-hover:rotate-12 transition-transform duration-300"></i>
            View Facilities
          </button>
        </motion.div>
        
        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-12 flex flex-wrap justify-center items-center gap-6 text-white/70"
        >
          <div className="flex items-center">
            <i className="fas fa-check-circle text-green-400 mr-2"></i>
            <span className="text-sm">1000+ Happy Customers</span>
          </div>
          <div className="flex items-center">
            <i className="fas fa-check-circle text-green-400 mr-2"></i>
            <span className="text-sm">Instant Booking</span>
          </div>
          <div className="flex items-center">
            <i className="fas fa-check-circle text-green-400 mr-2"></i>
            <span className="text-sm">Secure Payments</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
