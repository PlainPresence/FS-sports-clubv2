import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createBooking } from '@/lib/firebase';
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
        date: new Date().toISOString().split('T')[0], // Today's date
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
      const bookingData = {
        bookingId: generateBookingId(),
        fullName: formData.fullName,
        mobile: formData.mobile,
        email: formData.email || '',
        sportType: formData.sportType,
        date: formData.date,
        timeSlot: formData.timeSlot,
        amount: formData.amount,
        speedMeter: formData.speedMeter,
        speedMeterPrice: formData.speedMeterPrice,
        paymentStatus: 'success', // Admin booking is automatically confirmed
        bookingDate: new Date(),
        status: 'confirmed',
        isAdminBooking: true, // Flag to identify admin-created bookings
      };

      const result = await createBooking(bookingData);
      
      if (result.success) {
        // Send notifications
        if (formData.email) {
          await sendBookingConfirmation(bookingData);
        }
        sendWhatsAppNotification(bookingData);

        toast({
          title: 'Booking Created Successfully!',
          description: `Booking ID: ${bookingData.bookingId}. WhatsApp confirmation sent to customer.`,
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
                <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700">
                  Full Name *
                </Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Customer's full name"
                  className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>

              <div>
                <Label htmlFor="mobile" className="text-sm font-semibold text-gray-700">
                  Mobile Number *
                </Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  placeholder="Customer's mobile number"
                  className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                Email (Optional)
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Customer's email address"
                className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Booking Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Booking Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sportType" className="text-sm font-semibold text-gray-700">
                  Sport/Facility *
                </Label>
                <select
                  id="sportType"
                  value={formData.sportType}
                  onChange={(e) => handleInputChange('sportType', e.target.value)}
                  className="w-full h-12 border border-gray-200 rounded-lg focus:border-primary focus:ring-primary/20 px-3"
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
                <Label htmlFor="date" className="text-sm font-semibold text-gray-700">
                  Date *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>

              <div>
                <Label htmlFor="timeSlot" className="text-sm font-semibold text-gray-700">
                  Time Slot *
                </Label>
                <select
                  id="timeSlot"
                  value={formData.timeSlot}
                  onChange={(e) => handleInputChange('timeSlot', e.target.value)}
                  className="w-full h-12 border border-gray-200 rounded-lg focus:border-primary focus:ring-primary/20 px-3"
                  required
                >
                  <option value="">Select time slot</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot.replace('-', ' - ').replace(/(\d{2}):(\d{2})/g, (match, hour, minute) => {
                        const h = parseInt(hour);
                        return `${h > 12 ? h - 12 : h || 12}:${minute} ${h >= 12 ? 'PM' : 'AM'}`;
                      })}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Speed Meter Addon (only for cricket) */}
            {formData.sportType === 'cricket' && (
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="speedMeter"
                  checked={formData.speedMeter}
                  onChange={(e) => handleInputChange('speedMeter', e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <Label htmlFor="speedMeter" className="text-sm font-semibold text-gray-700">
                  Speed Meter Add-on (₹100)
                </Label>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount" className="text-sm font-semibold text-gray-700">
                  Amount (₹) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', Number(e.target.value))}
                  placeholder="Enter amount"
                  className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>

              <div className="flex items-end">
                <div className="w-full p-3 bg-primary/10 rounded-lg">
                  <div className="text-sm text-gray-600">Total Amount</div>
                  <div className="text-xl font-bold text-primary">
                    ₹{formData.amount + (formData.speedMeter ? 100 : 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isProcessing}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
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