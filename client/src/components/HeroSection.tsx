import { motion } from 'framer-motion';

interface HeroSectionProps {
  onBookNowClick: () => void;
}

export default function HeroSection({ onBookNowClick }: HeroSectionProps) {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://images.unsplash.com/photo-1551698618-1dfe5d97d256?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80')"
        }}
      />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Premium Multi-Sport
            <span className="block text-primary">Turf Experience</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-2xl mx-auto leading-relaxed">
            State-of-the-art facilities for Cricket, Football, Badminton & more. Book your perfect playing time with instant confirmation.
          </p>
        </motion.div>
        
        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div 
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-clock text-white text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">24/7 Booking</h3>
            <p className="text-gray-200">Book anytime, anywhere with instant confirmation</p>
          </motion.div>

          <motion.div 
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-shield-alt text-white text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Secure Payments</h3>
            <p className="text-gray-200">Safe & secure online payments with Razorpay</p>
          </motion.div>

          <motion.div 
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-trophy text-white text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Pro Facilities</h3>
            <p className="text-gray-200">Professional-grade equipment and surfaces</p>
          </motion.div>
        </div>

        <motion.button 
          onClick={onBookNowClick}
          className="bg-primary hover:bg-primary-dark text-white px-12 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
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
    </section>
  );
}
