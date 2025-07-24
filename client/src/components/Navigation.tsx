import { useState } from 'react';
import { Link } from 'wouter';

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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <i className="fas fa-futbol text-white text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SportsTurf Pro</h1>
              <p className="text-xs text-gray-500">Multi-Sport Facility</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('home')} 
              className="text-gray-600 hover:text-primary transition-colors duration-200 font-medium"
            >
              Home
            </button>
            <button 
              onClick={() => scrollToSection('sports')} 
              className="text-gray-600 hover:text-primary transition-colors duration-200 font-medium"
            >
              Sports
            </button>
            <button 
              onClick={() => scrollToSection('booking')} 
              className="text-gray-600 hover:text-primary transition-colors duration-200 font-medium"
            >
              Book Now
            </button>
            <button 
              onClick={() => scrollToSection('contact')} 
              className="text-gray-600 hover:text-primary transition-colors duration-200 font-medium"
            >
              Contact
            </button>
          </div>
          
          <button 
            className="md:hidden text-gray-600 hover:text-primary"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <i className="fas fa-bars text-xl"></i>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-2 space-y-2">
            <button 
              onClick={() => scrollToSection('home')} 
              className="block w-full text-left px-3 py-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
            >
              Home
            </button>
            <button 
              onClick={() => scrollToSection('sports')} 
              className="block w-full text-left px-3 py-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
            >
              Sports
            </button>
            <button 
              onClick={() => scrollToSection('booking')} 
              className="block w-full text-left px-3 py-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
            >
              Book Now
            </button>
            <button 
              onClick={() => scrollToSection('contact')} 
              className="block w-full text-left px-3 py-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
            >
              Contact
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
