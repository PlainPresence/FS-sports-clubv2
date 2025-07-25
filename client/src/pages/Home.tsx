import { useState } from 'react';
import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import SportsSection from '@/components/SportsSection';
import UpcomingSlots from '@/components/UpcomingSlots';
import BookingSection from '@/components/BookingSection';
import ConfirmationSection from '@/components/ConfirmationSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';

export default function Home() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState(null);

  const handleBookingSuccess = (data: any) => {
    setBookingData(data);
    setShowConfirmation(true);
  };

  const handleBookAnother = () => {
    setShowConfirmation(false);
    setBookingData(null);
    const bookingSection = document.getElementById('booking');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBookNowClick = () => {
    const bookingSection = document.getElementById('booking');
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-teal-100">
      {/* Navigation stays as is */}
      <Navigation />
      {showConfirmation && bookingData ? (
        <div className="pt-16">
          <ConfirmationSection 
            bookingData={bookingData} 
            onBookAnother={handleBookAnother} 
          />
        </div>
      ) : (
        <>
          <HeroSection onBookNowClick={handleBookNowClick} />
          {/* Themed Sports Section */}
          <SportsSection />
          {/* Themed Upcoming Slots Section */}
          <UpcomingSlots />
          {/* Themed Booking Section */}
          <BookingSection onBookingSuccess={handleBookingSuccess} />
          {/* Themed Contact Section */}
          <ContactSection />
        </>
      )}
      {/* Themed Footer */}
      <Footer />
    </div>
  );
}
