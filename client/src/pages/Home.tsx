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
          {/* About Turf Section */}
          <section className="max-w-3xl mx-auto my-8 px-2 sm:px-4">
            <div className="bg-white/90 rounded-2xl shadow-lg p-4 sm:p-8 text-center border border-primary/10">
              <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">About Our Turf</h2>
              <p className="text-gray-700 text-sm sm:text-base mb-4">FS Sports Club offers a premium cricket turf in Malegaon, open <span className='font-semibold text-green-600'>24/7</span> for your convenience. Our facility features:</p>
              <ul className="text-gray-600 text-sm sm:text-base mb-4 space-y-1 text-left max-w-md mx-auto">
                <li><span className="font-semibold text-primary">• Size:</span> 65ft x 110ft (full-size cricket turf)</li>
                <li><span className="font-semibold text-primary">• Surface:</span> High-quality artificial grass</li>
                <li><span className="font-semibold text-primary">• Lighting:</span> Powerful floodlights for night play</li>
                <li><span className="font-semibold text-primary">• Amenities:</span> Washrooms, parking, seating area, drinking water, canteen (snacks & refreshments)</li>
                <li><span className="font-semibold text-primary">• Location:</span> Beside Nayara petrol pump, Madde Hotel, Daregaon, Malegaon, 423203</li>
                <li><span className="font-semibold text-primary">• Add-on:</span> Speed Meter available for ball speed checks</li>
              </ul>
              <div className="text-xs sm:text-sm text-gray-500">Contact: <span className="font-semibold text-gray-700">7066990055</span></div>
            </div>
          </section>
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
