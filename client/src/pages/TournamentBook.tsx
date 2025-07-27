import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import TournamentBookingForm from '@/components/TournamentBookingForm';
import ConfirmationSection from '@/components/ConfirmationSection';

export default function TournamentBook() {
  const [location] = useLocation();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState(null);

  // Extract tournament ID from URL: /tournament/{id}/book
  const tournamentId = location.split('/')[2];

  const handleBookingSuccess = (data: any) => {
    setBookingData(data);
    setShowConfirmation(true);
  };

  const handleBookAnother = () => {
    setShowConfirmation(false);
    setBookingData(null);
    window.location.href = '/tournaments';
  };

  if (showConfirmation && bookingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-teal-100">
        <Navigation />
        <div className="pt-16">
          <ConfirmationSection 
            bookingData={bookingData} 
            onBookAnother={handleBookAnother}
            isTournament={true}
          />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-teal-100">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-20 pb-12 sm:pt-24 sm:pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-2xl shadow-lg mb-6">
              <span className="text-3xl sm:text-4xl">🏆</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Tournament <span className="text-primary">Registration</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Register your team for the tournament. Complete the form below and secure your spot!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Booking Form Section */}
      <section className="py-12 sm:py-16">
        <TournamentBookingForm 
          tournamentId={tournamentId} 
          onBookingSuccess={handleBookingSuccess}
        />
      </section>

      <Footer />
    </div>
  );
} 