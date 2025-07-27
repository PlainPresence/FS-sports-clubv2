import { useState } from 'react';
import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import SportsSection from '@/components/SportsSection';
import UpcomingSlots from '@/components/UpcomingSlots';
import BookingSection from '@/components/BookingSection';
import ConfirmationSection from '@/components/ConfirmationSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import PWAInstallSection from '@/components/PWAInstallSection';
// import founderPhoto from '@/assets/founder.jpg';

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
          
          {/* Professional About Turf Section */}
          <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="text-center mb-12 sm:mb-16">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg mb-6">
                  <i className="fas fa-trophy text-white text-2xl sm:text-3xl"></i>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                  About Our <span className="text-primary">Premium Turf</span>
                </h2>
                <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  FS Sports Club offers a world-class cricket facility in Malegaon, operating 
                  <span className="font-bold text-primary mx-2">24/7</span> 
                  for your convenience. Experience professional-grade equipment and amenities.
                </p>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Left Column - Founder Section */}
                <div className="space-y-6">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-white/50">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <i className="fas fa-user-tie text-primary mr-3"></i>
                      Meet Our Founder
                    </h3>
                    <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                      {/* Founder Photo */}
                      <div className="flex-shrink-0">
                        <div className="w-32 h-40 sm:w-40 sm:h-48 bg-primary rounded-2xl shadow-lg overflow-hidden">
                          {/* <img 
                            src={founderPhoto} 
                            alt="FS Sports Club Founder" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          /> */}
                          <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">Photo</span>
                          </div>
                        </div>
                        <p className="text-center mt-2 text-sm font-medium text-gray-700">Founder</p>
                      </div>
                      
                      {/* Founder Info */}
                      <div className="flex-1 text-center sm:text-left">
                        <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">FS Sports Club</h4>
                        <p className="text-gray-600 text-sm sm:text-base mb-4 leading-relaxed">
                          Dedicated to providing world-class sports facilities and exceptional service to our community. 
                          Our commitment to excellence ensures every player has the best experience possible.
                        </p>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2">
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
                </div>

                {/* Right Column - Facility Features */}
                <div className="space-y-6">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-white/50">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center">
                      <i className="fas fa-star text-primary mr-3"></i>
                      Facility Features
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                          <i className="fas fa-ruler-combined text-primary text-lg"></i>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-base sm:text-lg">Professional Size</h4>
                          <p className="text-gray-600 text-sm sm:text-base">65ft x 110ft full-size cricket turf meeting international standards</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                          <i className="fas fa-seedling text-green-600 text-lg"></i>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-base sm:text-lg">Premium Surface</h4>
                          <p className="text-gray-600 text-sm sm:text-base">High-quality artificial grass with optimal bounce and grip</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                          <i className="fas fa-lightbulb text-yellow-600 text-lg"></i>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-base sm:text-lg">Professional Lighting</h4>
                          <p className="text-gray-600 text-sm sm:text-base">Powerful floodlights ensuring perfect visibility for night matches</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                          <i className="fas fa-tachometer-alt text-blue-600 text-lg"></i>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-base sm:text-lg">Speed Meter</h4>
                          <p className="text-gray-600 text-sm sm:text-base">Professional ball speed measurement for training and analysis</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amenities Section - Full Width */}
              <div className="mt-8 lg:mt-12">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-white/50">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <i className="fas fa-concierge-bell text-primary mr-3"></i>
                    Amenities & Services
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <i className="fas fa-restroom text-primary text-sm"></i>
                      </div>
                      <span className="text-gray-700 text-sm sm:text-base">Clean Washrooms</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <i className="fas fa-parking text-primary text-sm"></i>
                      </div>
                      <span className="text-gray-700 text-sm sm:text-base">Free Parking</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <i className="fas fa-chair text-primary text-sm"></i>
                      </div>
                      <span className="text-gray-700 text-sm sm:text-base">Seating Area</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <i className="fas fa-tint text-primary text-sm"></i>
                      </div>
                      <span className="text-gray-700 text-sm sm:text-base">Drinking Water</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <i className="fas fa-utensils text-primary text-sm"></i>
                      </div>
                      <span className="text-gray-700 text-sm sm:text-base">Canteen</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <i className="fas fa-coffee text-primary text-sm"></i>
                      </div>
                      <span className="text-gray-700 text-sm sm:text-base">Refreshments</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location & Contact Section */}
              <div className="mt-8 lg:mt-12">
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 sm:p-8 shadow-xl border border-primary/20">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <i className="fas fa-map-marker-alt text-primary mr-3"></i>
                    Location & Contact
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                          <i className="fas fa-map-marker-alt text-primary text-lg"></i>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-base sm:text-lg">Address</h4>
                          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                            FS Sports Club, beside Nayara petrol pump,<br />
                            Madde Hotel, Daregaon, Malegaon, 423203
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-phone text-green-600 text-lg"></i>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-base sm:text-lg">Contact Number</h4>
                          <a 
                            href="tel:7066990055" 
                            className="text-primary font-bold text-lg sm:text-xl hover:text-primary/80 transition-colors"
                          >
                            7066990055
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Call to Action */}
              <div className="text-center mt-12 sm:mt-16">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-white/50 max-w-2xl mx-auto">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                    Ready to Experience Premium Cricket?
                  </h3>
                  <p className="text-gray-600 text-base sm:text-lg mb-6">
                    Book your slot now and enjoy world-class facilities with professional service
                  </p>
                  <button 
                    onClick={handleBookNowClick}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-bold py-3 sm:py-4 px-8 sm:px-12 rounded-xl text-lg sm:text-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    <i className="fas fa-calendar-check mr-3"></i>
                    Book Your Slot Now
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Our Premium Facilities Section */}
          <section className="py-16 sm:py-20 bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12 sm:mb-16">
                {/* Logo */}
                <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-2xl shadow-lg mb-6">
                  <img 
                    src="/logo.png" 
                    alt="FS Sports Club Logo" 
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-xl flex items-center justify-center hidden">
                    <i className="fas fa-trophy text-primary text-2xl sm:text-3xl"></i>
                  </div>
                </div>
                
                {/* Main Heading */}
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                  Our Premium Facilities
                </h2>
                
                {/* Description */}
                <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  Experience world-class sports facilities designed for both casual players and competitive athletes
                </p>
              </div>
            </div>
          </section>

          {/* Themed Sports Section */}
          <SportsSection />
          {/* PWA Install Section */}
          <PWAInstallSection />
          {/* Themed Upcoming Slots Section */}
          <UpcomingSlots />
          {/* Themed Booking Section */}
          <BookingSection onBookingSuccess={handleBookingSuccess} />
          {/* Themed Contact Section */}
          <ContactSection />
        </>
      )}
      <Footer />
    </div>
  );
}
