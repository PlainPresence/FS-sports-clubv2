import { useState } from 'react';
import { Link } from 'wouter';
import logo from '@/assets/logo.png';

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl shadow-sm">
              <img src={logo} alt="FS Sports Club Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FS Sports Club</h1>
              <p className="text-sm text-gray-600 font-medium">Premium Multi-Sport Facility</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-1">
            <button 
              onClick={() => scrollToSection('home')} 
              className="px-4 py-2 text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200 font-medium"
            >
              Home
            </button>
            <button 
              onClick={() => scrollToSection('sports')} 
              className="px-4 py-2 text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200 font-medium"
            >
              Sports
            </button>
            <button 
              onClick={() => scrollToSection('booking')} 
              className="px-4 py-2 text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200 font-medium"
            >
              Book Now
            </button>
            <button 
              onClick={() => scrollToSection('contact')} 
              className="px-4 py-2 text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200 font-medium"
            >
              Contact
            </button>
            <button 
              onClick={() => scrollToSection('booking')} 
              className="ml-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Book Now
            </button>
          </div>
          
          <button 
            className="md:hidden text-gray-600 hover:text-primary p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <i className="fas fa-bars text-xl"></i>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200/50 shadow-lg">
          <div className="px-4 py-4 space-y-2">
            <button 
              onClick={() => scrollToSection('home')} 
              className="block w-full text-left px-4 py-3 text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200 font-medium"
            >
              <i className="fas fa-home mr-3 text-primary"></i>
              Home
            </button>
            <button 
              onClick={() => scrollToSection('sports')} 
              className="block w-full text-left px-4 py-3 text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200 font-medium"
            >
              <i className="fas fa-trophy mr-3 text-primary"></i>
              Sports
            </button>
            <button 
              onClick={() => scrollToSection('booking')} 
              className="block w-full text-left px-4 py-3 text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200 font-medium"
            >
              <i className="fas fa-calendar-check mr-3 text-primary"></i>
              Book Now
            </button>
            <button 
              onClick={() => scrollToSection('contact')} 
              className="block w-full text-left px-4 py-3 text-gray-700 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200 font-medium"
            >
              <i className="fas fa-phone mr-3 text-primary"></i>
              Contact
            </button>
            <div className="pt-2">
              <button 
                onClick={() => scrollToSection('booking')} 
                className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-200 font-semibold shadow-md"
              >
                <i className="fas fa-calendar-check mr-2"></i>
                Book Your Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
