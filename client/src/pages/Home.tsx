import { useState } from 'react';
import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import SportsSection from '@/components/SportsSection';
import UpcomingSlots from '@/components/UpcomingSlots';
import BookingSection from '@/components/BookingSection';
import ConfirmationSection from '@/components/ConfirmationSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useEffect } from 'react';
import { getTurfImages } from '@/lib/firebase';

export default function Home() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [turfImages, setTurfImages] = useState<any[]>([]);
  const [turfImagesLoading, setTurfImagesLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      setTurfImagesLoading(true);
      const images = await getTurfImages();
      images.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setTurfImages(images);
      setTurfImagesLoading(false);
    };
    fetchImages();
  }, []);

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
      {/* Turf Image Slideshow */}
      {!turfImagesLoading && turfImages.length > 0 && (
        <section className="max-w-4xl mx-auto mt-6 mb-12">
          <Carousel className="relative">
            <CarouselContent>
              {turfImages.map((img, idx) => (
                <CarouselItem key={img.id}>
                  <img src={img.url} alt={`Turf ${idx + 1}`} className="w-full h-72 md:h-96 object-cover rounded-2xl shadow-lg" />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </section>
      )}
      {showConfirmation && bookingData ? (
        <div className="pt-16">
          <ConfirmationSection 
            bookingData={bookingData} 
            onBookAnother={handleBookAnother} 
          />
        </div>
      ) : (
        <>
          {/* Hero Section with gradient and bold header */}
          <section className="bg-gradient-to-r from-blue-500 via-green-400 to-teal-400 py-20 text-center rounded-b-3xl shadow-xl mb-12">
            <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-lg">Welcome to SportsTurf Pro</h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">Book your favorite sports slot with ease</p>
            <button
              onClick={handleBookNowClick}
              className="bg-white text-blue-600 font-bold px-8 py-4 rounded-full shadow-lg hover:bg-blue-50 hover:scale-105 transition-all text-lg"
            >
              Book Now <i className="fas fa-arrow-right ml-2"></i>
            </button>
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
