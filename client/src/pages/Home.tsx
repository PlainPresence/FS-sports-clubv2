import { useState } from 'react';
import { useLocation } from 'wouter';
import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import SportsSection from '@/components/SportsSection';
import UpcomingSlots from '@/components/UpcomingSlots';
import BookingSection from '@/components/BookingSection';
import ConfirmationSection from '@/components/ConfirmationSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import PWAInstallSection from '@/components/PWAInstallSection';
import founderPhoto from '@/assets/founder.jpg';
import { motion } from 'framer-motion';

export default function Home() {
  const [, setLocation] = useLocation();
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <img src="/logo192.png" alt="FS Sports Club Logo" className="w-10 h-10 rounded-xl shadow" />
            <span className="text-xl font-bold text-primary tracking-tight">FS Sports Club</span>
          </div>
          <nav className="hidden md:flex space-x-6">
            <button onClick={() => setLocation('/')} className="text-gray-700 hover:text-primary font-semibold">Home</button>
            <button onClick={() => setLocation('/tournaments')} className="text-gray-700 hover:text-purple-600 font-semibold">Tournaments</button>
            <button onClick={() => setLocation('/#contact')} className="text-gray-700 hover:text-green-600 font-semibold">Contact</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-6 py-6 md:py-10">
        {showConfirmation && bookingData ? (
          <div className="pt-8">
            <ConfirmationSection 
              bookingData={bookingData} 
              onBookAnother={handleBookAnother} 
            />
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <section className="mb-8">
              <div className="rounded-2xl bg-white shadow p-6 sm:p-10 flex flex-col items-center">
                <HeroSection onBookNowClick={handleBookNowClick} />
              </div>
            </section>

            {/* About/Founder Section */}
            <section className="mb-8">
              <div className="rounded-2xl bg-white shadow p-6 sm:p-10">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
                    <i className="fas fa-trophy text-primary text-2xl"></i>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                    About Our <span className="text-primary">Premium Turf</span>
                  </h2>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    FS Sports Club offers a world-class cricket facility in Malegaon, operating <span className="font-bold text-primary mx-1">24/7</span> for your convenience. Experience professional-grade equipment and amenities.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Founder Section */}
                  <div className="flex flex-col items-center md:items-start">
                    <div className="w-32 h-40 sm:w-40 sm:h-48 bg-primary rounded-2xl shadow-lg overflow-hidden mb-3">
                      <img 
                        src={founderPhoto} 
                        alt="FS Sports Club Founder" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center hidden">
                        <span className="text-white font-semibold text-lg">Photo</span>
                      </div>
                    </div>
                    <p className="text-center md:text-left text-sm font-medium text-gray-700">Founder</p>
                  </div>
                  {/* Founder Info */}
                  <div className="flex-1 text-center md:text-left flex flex-col justify-center">
                    <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">FS Sports Club</h4>
                    <p className="text-gray-600 text-sm sm:text-base mb-4 leading-relaxed">
                      Dedicated to providing world-class sports facilities and exceptional service to our community. Our commitment to excellence ensures every player has the best experience possible.
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        <i className="fas fa-star mr-1"></i>
                        Quality Service
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <i className="fas fa-clock mr-1"></i>
                        24/7 Available
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        <i className="fas fa-users mr-1"></i>
                        Community Focus
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Facility Features Section */}
            <section className="mb-8">
              <div className="rounded-2xl bg-white shadow p-6 sm:p-10">
                <SportsSection />
              </div>
            </section>

            {/* Tournament Section */}
            <section className="mb-8">
              <div className="rounded-2xl bg-white shadow p-6 sm:p-10">
                <motion.div 
                  className="text-center mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-2xl mb-4">
                    <span className="text-3xl">🏆</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                    Join Our <span className="text-purple-600">Tournaments</span>
                  </h2>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Compete with the best teams in exciting tournaments. Register your team and showcase your skills!
                  </p>
                </motion.div>
                <motion.div 
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                >
                  <button 
                    onClick={() => setLocation('/tournaments')}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <span className="mr-2">🏆</span>
                    <span>View Tournaments</span>
                  </button>
                </motion.div>
              </div>
            </section>

            {/* Booking Section */}
            <section className="mb-8" id="booking">
              <div className="rounded-2xl bg-white shadow p-6 sm:p-10">
                <BookingSection onBookingSuccess={handleBookingSuccess} />
              </div>
            </section>

            {/* Contact Section */}
            <section className="mb-8" id="contact">
              <div className="rounded-2xl bg-white shadow p-6 sm:p-10">
                <ContactSection />
              </div>
            </section>

            {/* PWA Install Section */}
            <section className="mb-8">
              <div className="rounded-2xl bg-white shadow p-6 sm:p-10">
                <PWAInstallSection />
              </div>
            </section>

            {/* Upcoming Slots Section */}
            <section className="mb-8">
              <div className="rounded-2xl bg-white shadow p-6 sm:p-10">
                <UpcomingSlots />
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
