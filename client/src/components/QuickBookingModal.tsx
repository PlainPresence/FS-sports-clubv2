import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { sendBookingConfirmation } from '@/lib/emailjs';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import LoadingSpinner from './LoadingSpinner';

interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const sports = [
  { id: 'cricket', label: 'Cricket', icon: '🏏' },
  { id: 'snooker', label: 'Snooker Table', icon: '🎱' },
  { id: 'pool', label: '8 Ball Pool', icon: '🎱' },
  { id: 'airhockey', label: 'Air Hockey Table', icon: '🏒' },
];

const timeSlots = [
  '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
  '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00',
  '17:00-18:00', '18:00-19:00', '19:00-20:00', '20:00-21:00',
  '21:00-22:00', '22:00-23:00', '23:00-00:00', '00:00-01:00',
  '01:00-02:00', '02:00-03:00'
];

// Convert 24-hour format slot to AM/PM
const convertToAmPmFormat = (slot: string) => {
  const [start, end] = slot.split('-');
  const formatTime = (time: string) => {
    let [hour, minute] = time.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    // Never pad hour with zero
    return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
  };
  // Normalize both start and end
  return `${formatTime(start)} - ${formatTime(end)}`;
};

export default function QuickBookingModal({ isOpen, onClose, onSuccess }: QuickBookingModalProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    email: '',
    sportType: 'cricket',
    date: '',
    timeSlot: '',
    amount: 0,
    speedMeter: false,
    speedMeterPrice: 0,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        fullName: '',
        mobile: '',
        email: '',
        sportType: 'cricket',
        date: new Date().toISOString().split('T')[0],
        timeSlot: '',
        amount: 0,
        speedMeter: false,
        speedMeterPrice: 0,
      });
    }
  }, [isOpen]);

  const generateBookingId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `QBK${timestamp}${randomStr}`.toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.mobile || !formData.date || !formData.timeSlot || formData.amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields with valid values.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const bookingId = generateBookingId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
      
      // Store timeSlot in AM/PM format for backend and WebSocket consistency
      const bookingData = {
        amount: formData.amount + (formData.speedMeter ? formData.speedMeterPrice || 100 : 0),
        bookingId: bookingId,
        bookingType: "regular",
        cashfreeOrderId: null, // Admin bookings don't have payment gateway data
        cashfreePaymentId: null,
        cashfreePaymentStatus: null,
        createdAt: now,
        customerDetails: {
          customer_email: formData.email || "",
          customer_id: bookingId,
          customer_name: formData.fullName,
          customer_phone: formData.mobile
        },
        date: formData.date,
        email: formData.email || null,
        expiresAt: expiresAt,
        fullName: formData.fullName,
        mobile: formData.mobile,
        paymentStatus: "success", // Admin bookings are automatically successful
        speedMeter: formData.speedMeter,
        speedMeterPrice: formData.speedMeter ? (formData.speedMeterPrice || 100) : 0,
        sportType: formData.sportType,
        status: "confirmed",
        timeSlots: [convertToAmPmFormat(formData.timeSlot)], // Always normalized
        updatedAt: now
      };

      const result = await fetch('/api/book-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: bookingData.date,
          sportType: bookingData.sportType,
          timeSlots: bookingData.timeSlots,
          bookingData: bookingData,
          isAdminBooking: true
        }),
      }).then(res => res.json());

      if (result.success) {
        // Send email confirmation if email provided
        if (formData.email) {
          try {
            await sendBookingConfirmation({
              ...bookingData,
              timeSlot: formData.timeSlot // Keep original format for email
            });
          } catch (emailError) {
            console.warn('Email confirmation failed:', emailError);
            // Don't fail the booking if email fails
          }
        }

        // Send WhatsApp notification
        try {
          sendWhatsAppNotification({
            ...bookingData,
            timeSlot: formData.timeSlot // Keep original format for WhatsApp
          });
        } catch (whatsappError) {
          console.warn('WhatsApp notification failed:', whatsappError);
          // Don't fail the booking if WhatsApp fails
        }

        toast({
          title: 'Booking Created Successfully!',
          description: `Booking ID: ${bookingData.bookingId}. Customer notifications sent.`,
        });

        onSuccess();
        onClose();
      } else {
        toast({
          title: 'Booking Failed',
          description: result.error || 'Failed to create booking.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Quick booking error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create booking. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Quick Booking</h2>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              <i className="fas fa-times text-xl"></i>
            </Button>
          </div>
          <p className="text-gray-600 mt-2">Create a booking directly from admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
          </div>

          {/* Booking Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Booking Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sportType">Sport/Facility *</Label>
                <select
                  id="sportType"
                  value={formData.sportType}
                  onChange={(e) => handleInputChange('sportType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {sports.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {sport.icon} {sport.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="timeSlot">Time Slot *</Label>
                <select
                  id="timeSlot"
                  value={formData.timeSlot}
                  onChange={(e) => handleInputChange('timeSlot', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select time slot</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {convertToAmPmFormat(slot)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Speed Meter Addon */}
            {formData.sportType === 'cricket' && (
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="speedMeter"
                  checked={formData.speedMeter}
                  onChange={(e) => {
                    handleInputChange('speedMeter', e.target.checked);
                    if (e.target.checked) {
                      handleInputChange('speedMeterPrice', 100);
                    } else {
                      handleInputChange('speedMeterPrice', 0);
                    }
                  }}
                />
                <Label htmlFor="speedMeter">Speed Meter Add-on (₹100)</Label>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Base Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', Number(e.target.value))}
                  required
                />
              </div>
              <div className="flex items-end">
                <div className="w-full p-3 bg-primary/10 rounded-lg">
                  <div className="text-sm text-gray-600">Total Amount</div>
                  <div className="text-xl font-bold text-primary">
                    ₹{formData.amount + (formData.speedMeter ? (formData.speedMeterPrice || 100) : 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button type="button" onClick={onClose} variant="outline" disabled={isProcessing}>
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating Booking...
                </>
              ) : (
                <>
                  <i className="fas fa-check mr-2"></i>
                  Create Booking
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
