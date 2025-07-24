export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <i className="fas fa-futbol text-white text-xl"></i>
              </div>
              <div>
                <h3 className="text-2xl font-bold">SportsTurf Pro</h3>
                <p className="text-gray-400">Multi-Sport Facility</p>
              </div>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              Premier multi-sport facility offering world-class playing surfaces for cricket, football, badminton, and basketball. Book your perfect playing time with our seamless online booking system.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center hover:bg-primary/80 transition-colors">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center hover:bg-primary/80 transition-colors">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center hover:bg-primary/80 transition-colors">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center hover:bg-primary/80 transition-colors">
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li><a href="#home" className="text-gray-400 hover:text-white transition-colors">Home</a></li>
              <li><a href="#sports" className="text-gray-400 hover:text-white transition-colors">Sports</a></li>
              <li><a href="#booking" className="text-gray-400 hover:text-white transition-colors">Book Now</a></li>
              <li><a href="#contact" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Facilities</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-6">Contact Info</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <i className="fas fa-map-marker-alt text-primary mt-1"></i>
                <span className="text-gray-400 text-sm">123 Sports Complex, Stadium Road<br />Mumbai, Maharashtra 400001</span>
              </li>
              <li className="flex items-center space-x-3">
                <i className="fas fa-phone text-primary"></i>
                <span className="text-gray-400">+91 98765 43210</span>
              </li>
              <li className="flex items-center space-x-3">
                <i className="fas fa-envelope text-primary"></i>
                <span className="text-gray-400">bookings@sportsturfpro.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 SportsTurf Pro. All rights reserved. Built with Firebase & Razorpay.
            </p>
            <div className="mt-4 md:mt-0 flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Refund Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
