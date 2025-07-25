import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { openWhatsApp } from '@/lib/whatsapp';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ConfirmationSectionProps {
  bookingData: any;
  onBookAnother: () => void;
}

export default function ConfirmationSection({ bookingData, onBookAnother }: ConfirmationSectionProps) {
  const handleWhatsAppShare = () => {
    openWhatsApp(bookingData);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('SportsTurf Pro - Booking Receipt', 14, 18);
    doc.setFontSize(12);
    doc.text(`Booking ID: ${bookingData.bookingId}`, 14, 30);
    doc.text(`Name: ${bookingData.fullName}`, 14, 38);
    doc.text(`Mobile: ${bookingData.mobile}`, 14, 46);
    doc.text(`Sport: ${bookingData.sportType}`, 14, 54);
    doc.text(`Date: ${formatDate(bookingData.date)}`, 14, 62);
    if (Array.isArray(bookingData.timeSlots)) {
      doc.text('Time:', 14, 70);
      bookingData.timeSlots.forEach((slot: string, idx: number) => {
        doc.text(`- ${formatTimeSlot(slot)}`, 20, 78 + idx * 8);
      });
    } else {
      doc.text(`Time: ${formatTimeSlot(bookingData.timeSlot)}`, 14, 70);
    }
    const timeOffset = Array.isArray(bookingData.timeSlots) ? (78 + (bookingData.timeSlots.length * 8)) : 78;
    doc.text(`Amount Paid:  ${bookingData.amount}`, 14, timeOffset);
    if (bookingData.teamName) {
      doc.text(`Team Name: ${bookingData.teamName}`, 14, 86);
    }
    doc.setFontSize(10);
    doc.text('Thank you for booking with SportsTurf Pro!', 14, 110);
    doc.save(`Booking_Receipt_${bookingData.bookingId}.pdf`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimeSlot = (timeSlot: string) => {
    return timeSlot.replace('-', ' - ').replace(/(\d{2}):(\d{2})/g, (match, hour, minute) => {
      const h = parseInt(hour);
      return `${h > 12 ? h - 12 : h || 12}:${minute} ${h >= 12 ? 'PM' : 'AM'}`;
    });
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Success Animation */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <motion.i 
              className="fas fa-check text-4xl text-green-600"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Booking Confirmed!</h2>
          <p className="text-xl text-gray-600">Your slot has been successfully reserved</p>
        </motion.div>

        {/* Booking Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="shadow-xl mb-8">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="text-sm text-gray-500 mb-2">Booking ID</div>
                <div className="text-2xl font-bold text-primary">{bookingData.bookingId}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Name</div>
                  <div className="font-semibold">{bookingData.fullName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Mobile</div>
                  <div className="font-semibold">{bookingData.mobile}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Sport</div>
                  <div className="font-semibold capitalize">{bookingData.sportType}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Date</div>
                  <div className="font-semibold">{formatDate(bookingData.date)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Time</div>
                  <div className="font-semibold">
                    {Array.isArray(bookingData.timeSlots)
                      ? bookingData.timeSlots.map((slot: string) => formatTimeSlot(slot)).join(', ')
                      : formatTimeSlot(bookingData.timeSlot)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Amount Paid</div>
                  <div className="font-semibold text-green-600">₹{bookingData.amount}</div>
                </div>
                {bookingData.teamName && (
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-500 mb-1">Team Name</div>
                    <div className="font-semibold">{bookingData.teamName}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Button 
            onClick={handleWhatsAppShare}
            className="w-full bg-green-500 hover:bg-green-600 text-white px-8 py-4 h-auto text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <i className="fab fa-whatsapp mr-3 text-xl"></i>
            Share on WhatsApp
          </Button>
          
          <Button 
            onClick={handleDownloadPDF}
            variant="outline"
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 h-auto text-lg font-semibold transition-all duration-300 transform hover:scale-105"
          >
            <i className="fas fa-download mr-3"></i>
            Download Receipt
          </Button>
        </motion.div>

        <div className="mt-8 text-center">
          <Button 
            onClick={onBookAnother}
            variant="link"
            className="text-primary hover:text-primary/80 font-semibold text-lg"
          >
            Book Another Slot
          </Button>
        </div>
      </div>
    </section>
  );
}
