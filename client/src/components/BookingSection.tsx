import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSlots } from '@/hooks/useSlots';
import { initiateRazorpayPayment } from '@/lib/razorpay';
import { createBooking, getSlotPrices, attemptBookingWithSlotCheck, logFailedPayment } from '@/lib/firebase';
import { sendBookingConfirmation } from '@/lib/emailjs';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import { BookingFormData } from '@/types';
import Shimmer from './Shimmer';
import LoadingSpinner from './LoadingSpinner';

const bookingSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().regex(/^[+]?\d{10,14}$/, 'Invalid mobile number'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  teamName: z.string().optional(),
  facilityType: z.string().min(1, 'Please select a facility'),
  date: z.string().min(1, 'Please select a date'),
  timeSlots: z.array(z.string()).min(1, 'Please select at least one slot'),
});

interface BookingSectionProps {
  onBookingSuccess: (bookingData: any) => void;
}

export default function BookingSection({ onBookingSuccess }: BookingSectionProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [prices, setPrices] = useState<Record<string, number> | null>(null);
  const [pricesLoading, setPricesLoading] = useState(true);
  // Add state for speed meter add-on
  const [speedMeter, setSpeedMeter] = useState(false);

  const facilityOptions = [
    { id: 'cricket', label: 'Cricket' },
    { id: 'snooker', label: 'Snooker Table' },
    { id: 'pool', label: '8 Ball Pool' },
    { id: 'airhockey', label: 'Air Hockey Table' },
  ];
  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      fullName: '',
      mobile: '',
      email: '',
      teamName: '',
      facilityType: 'cricket',
      date: '',
      timeSlots: [],
    },
  });

  const watchedFacility = form.watch('facilityType') || 'cricket';
  const watchedSport = watchedFacility;
  const watchedDate = form.watch('date');
  const watchedTimeSlots = form.watch('timeSlots');
  
  const { slots, loading: slotsLoading, error: slotsError } = useSlots(watchedDate, watchedSport);

  // Fetch prices from Firestore on mount
  useEffect(() => {
    const fetchPrices = async () => {
      setPricesLoading(true);
      try {
        const firestorePrices = await getSlotPrices();
        setPrices(firestorePrices);
      } catch (error) {
        setPrices(null);
      } finally {
        setPricesLoading(false);
      }
    };
    fetchPrices();
  }, []);

  const generateBookingId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `SPT${timestamp}${randomStr}`.toUpperCase();
  };

  const onSubmit = async (data: any) => {
    setIsProcessing(true);
    try {
      const bookingId = generateBookingId();
      const slotCount = watchedTimeSlots?.length || 0;
      
      // Calculate amount based on sport type and slot duration
      let amount = 0;
      if (prices && data.facilityType) {
        const basePrice = prices[data.facilityType] || 0;
        if (data.facilityType === 'airhockey') {
          // For air hockey, each slot is 30 minutes, so multiply by 0.5
          amount = (basePrice * 0.5 * data.timeSlots.length);
        } else {
          // For other sports, each slot is 1 hour
          amount = (basePrice * data.timeSlots.length);
        }
        
        // Add speed meter cost if applicable
        if (speedMeter && prices['speedMeter']) {
          amount += prices['speedMeter'] * data.timeSlots.length;
        }
      }
      const bookingData = {
        ...data,
        bookingId,
        amount,
        paymentStatus: 'pending',
        speedMeter,
        speedMeterPrice: speedMeter && prices && prices['speedMeter'] ? prices['speedMeter'] * data.timeSlots.length : 0,
        sportType: data.facilityType, // Add sportType field for consistency
        facilityType: data.facilityType,
      };
      // Initiate Razorpay payment
      await new Promise((resolve, reject) => {
        initiateRazorpayPayment({
          amount,
          bookingData,
          onSuccess: async (paymentData) => {
            try {
              // Atomic slot check and booking creation
              const finalBookingData = {
                ...bookingData,
                paymentStatus: 'success',
                razorpayPaymentId: paymentData.razorpay_payment_id,
                razorpayOrderId: paymentData.razorpay_order_id,
              };
              const bookingResult = await attemptBookingWithSlotCheck(finalBookingData);
              if (bookingResult && bookingResult.success) {
                if (data.email) {
                  await sendBookingConfirmation(finalBookingData);
                }
                sendWhatsAppNotification(finalBookingData);
                toast({
                  title: 'Booking Confirmed!',
                  description: 'Your slot has been booked. WhatsApp confirmation sent to customer.',
                });
                onBookingSuccess(finalBookingData);
                form.reset();
                resolve(paymentData);
              } else if (bookingResult && 'reason' in bookingResult && bookingResult.reason === 'Slot already booked') {
                await logFailedPayment({
                  ...finalBookingData,
                  reason: 'Slot already booked',
                  needsRefund: true,
                });
                toast({
                  title: 'Slot Unavailable',
                  description: `Payment received (ID: ${paymentData.razorpay_payment_id}), but one or more slots were just booked by someone else. Please contact support for a refund.`,
                  variant: 'destructive',
                });
                reject(new Error('Slot already booked'));
              } else {
                await logFailedPayment({
                  ...finalBookingData,
                  reason: bookingResult?.error || 'Unknown error',
                  needsRefund: true,
                });
                toast({
                  title: 'Booking Failed',
                  description: `Payment received (ID: ${paymentData.razorpay_payment_id}), but booking could not be completed. Please contact support for a refund.`,
                  variant: 'destructive',
                });
                reject(new Error('Booking failed after payment'));
              }
            } catch (error) {
              toast({
                title: 'Error',
                description: 'Payment successful but booking failed. Please contact support.',
                variant: 'destructive',
              });
              reject(error);
            }
          },
          onFailure: (error) => {
            toast({
              title: 'Payment Failed',
              description: error.error || 'Payment was unsuccessful. Please try again.',
              variant: 'destructive',
            });
            reject(error);
          },
        });
      });
    } catch (error) {
      console.error('Booking error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedFacility = watchedFacility;
  const slotCount = watchedTimeSlots?.length || 0;
  
  // Calculate total amount for display
  let totalAmount = 0;
  if (prices && watchedFacility) {
    const basePrice = prices[watchedFacility] || 0;
    if (watchedFacility === 'airhockey') {
      // For air hockey, each slot is 30 minutes, so multiply by 0.5
      totalAmount = (basePrice * 0.5 * slotCount);
    } else {
      // For other sports, each slot is 1 hour
      totalAmount = (basePrice * slotCount);
    }
    
    // Add speed meter cost if applicable
    if (speedMeter && prices['speedMeter']) {
      totalAmount += prices['speedMeter'] * slotCount;
    }
  }

  return (
    <section id="booking" className="py-12 sm:py-24 bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-4 sm:mb-6">
            <i className="fas fa-calendar-check text-xl sm:text-2xl text-primary"></i>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">Reserve Your Time</h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Secure your preferred slot with our streamlined booking process
          </p>
        </motion.div>

        {pricesLoading ? (
          <div className="flex justify-center py-12 sm:py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {/* Main Booking Form */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6 md:p-8 lg:p-10">
                <div className="flex items-center mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-gray-100">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                    <i className="fas fa-user text-primary text-sm sm:text-base"></i>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Personal Information</h3>
                    <p className="text-gray-600 text-xs sm:text-sm">Tell us about yourself</p>
                  </div>
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700 flex items-center">
                        <i className="fas fa-user mr-2 text-primary"></i>
                        Full Name *
                      </Label>
                      <Input
                        {...form.register('fullName')}
                        id="fullName"
                        placeholder="Enter your full name"
                        className="h-11 sm:h-12 border-gray-200 focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm sm:text-base"
                      />
                      {form.formState.errors.fullName && (
                        <p className="text-red-500 text-xs sm:text-sm flex items-center">
                          <i className="fas fa-exclamation-circle mr-1"></i>
                          {form.formState.errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobile" className="text-sm font-semibold text-gray-700 flex items-center">
                        <i className="fas fa-phone mr-2 text-primary"></i>
                        Mobile Number *
                      </Label>
                      <Input
                        {...form.register('mobile')}
                        id="mobile"
                        placeholder="+91 98765 43210"
                        type="tel"
                        className="h-11 sm:h-12 border-gray-200 focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm sm:text-base"
                      />
                      {form.formState.errors.mobile && (
                        <p className="text-red-500 text-xs sm:text-sm flex items-center">
                          <i className="fas fa-exclamation-circle mr-1"></i>
                          {form.formState.errors.mobile.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="teamName" className="text-sm font-semibold text-gray-700 flex items-center">
                        <i className="fas fa-users mr-2 text-primary"></i>
                        Team Name (Optional)
                      </Label>
                      <Input
                        {...form.register('teamName')}
                        id="teamName"
                        placeholder="Your team name"
                        className="h-11 sm:h-12 border-gray-200 focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm sm:text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center">
                        <i className="fas fa-envelope mr-2 text-primary"></i>
                        Email (Optional)
                      </Label>
                      <Input
                        {...form.register('email')}
                        id="email"
                        placeholder="your@email.com"
                        type="email"
                        className="h-11 sm:h-12 border-gray-200 focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm sm:text-base"
                      />
                      {form.formState.errors.email && (
                        <p className="text-red-500 text-xs sm:text-sm flex items-center">
                          <i className="fas fa-exclamation-circle mr-1"></i>
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Facility Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                        <i className="fas fa-trophy text-primary text-sm sm:text-base"></i>
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Select Facility</h3>
                        <p className="text-gray-600 text-xs sm:text-sm">Choose your preferred sport</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {facilityOptions.map(fac => (
                        <label key={fac.id} className={`relative cursor-pointer group transition-all duration-200 ${
                          watchedFacility === fac.id 
                            ? 'ring-2 ring-primary ring-offset-1 sm:ring-offset-2' 
                            : 'hover:ring-2 hover:ring-primary/50 ring-offset-1 sm:ring-offset-2'
                        }`}>
                          <input
                            type="radio"
                            name="facilityType"
                            value={fac.id}
                            checked={watchedFacility === fac.id}
                            onChange={() => form.setValue('facilityType', fac.id)}
                            className="sr-only"
                          />
                          <div className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                            watchedFacility === fac.id
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 bg-white hover:border-primary/30 hover:bg-primary/2'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 text-sm sm:text-base">{fac.label}</div>
                                {prices && prices[fac.id] && (
                                  <div className="text-xs sm:text-sm text-gray-600">
                                    ₹{prices[fac.id]}/{fac.id === 'airhockey' ? '30 min' : 'hour'}
                                  </div>
                                )}
                              </div>
                              <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center ml-2 ${
                                watchedFacility === fac.id
                                  ? 'border-primary bg-primary'
                                  : 'border-gray-300'
                              }`}>
                                {watchedFacility === fac.id && (
                                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                                )}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Date Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                        <i className="fas fa-calendar text-primary text-sm sm:text-base"></i>
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Select Date</h3>
                        <p className="text-gray-600 text-xs sm:text-sm">Choose your preferred date</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-sm font-semibold text-gray-700">
                        Preferred Date *
                      </Label>
                      <Input
                        {...form.register('date')}
                        id="date"
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        className="h-11 sm:h-12 border-gray-200 focus:border-primary focus:ring-primary/20 transition-all duration-200 text-sm sm:text-base"
                      />
                      {form.formState.errors.date && (
                        <p className="text-red-500 text-xs sm:text-sm flex items-center">
                          <i className="fas fa-exclamation-circle mr-1"></i>
                          {form.formState.errors.date.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Time Slot Selection */}
                  <div className="space-y-4">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                        <i className="fas fa-clock text-primary text-sm sm:text-base"></i>
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Select Time Slots</h3>
                        <p className="text-gray-600 text-xs sm:text-sm">Choose your preferred time slots</p>
                      </div>
                    </div>
                    
                    {slotsLoading ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <Shimmer key={i} className="h-14 sm:h-16 rounded-xl" />
                        ))}
                      </div>
                    ) : slotsError ? (
                      <div className="text-center py-6 sm:py-8 text-gray-500 bg-gray-50 rounded-xl">
                        <i className="fas fa-exclamation-triangle text-xl sm:text-2xl mb-2"></i>
                        <p className="text-sm sm:text-base">{slotsError}</p>
                      </div>
                    ) : watchedDate && watchedSport ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                        {slots.map((slot, idx) => {
                          const checked = watchedTimeSlots?.includes(slot.time);
                          const isDisabled = !slot.available;
                          return (
                            <Label key={slot.time} className={`cursor-pointer group ${isDisabled ? 'cursor-not-allowed' : ''}`}>
                              <input
                                type="checkbox"
                                value={slot.time}
                                checked={checked}
                                onChange={e => {
                                  const value = slot.time;
                                  let newSlots = watchedTimeSlots ? [...watchedTimeSlots] : [];
                                  if (e.target.checked) {
                                    newSlots.push(value);
                                    newSlots = newSlots.sort((a, b) => slots.findIndex(s => s.time === a) - slots.findIndex(s => s.time === b));
                                  } else {
                                    newSlots = newSlots.filter(s => s !== value);
                                  }
                                  form.setValue('timeSlots', newSlots);
                                }}
                                disabled={isDisabled}
                                className="sr-only peer"
                              />
                              <div className={`p-3 sm:p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                                checked
                                  ? 'border-primary bg-primary/10 shadow-lg'
                                  : slot.available
                                    ? 'border-gray-200 bg-white hover:border-primary/50 hover:shadow-md'
                                    : slot.booked
                                      ? 'border-gray-300 bg-gray-100 opacity-60'
                                      : 'border-red-200 bg-red-50 opacity-60'
                              }`}>
                                <div className={`font-bold text-xs sm:text-sm ${
                                  slot.available
                                    ? 'text-gray-900 group-hover:text-primary'
                                    : 'text-gray-400'
                                }`}>
                                  {slot.display}
                                </div>
                                <div className={`text-xs font-semibold mt-1 ${
                                  slot.available
                                    ? 'text-primary'
                                    : slot.booked
                                      ? 'text-red-500'
                                      : 'text-red-500'
                                }`}>
                                  {slot.available ? 'Available' : slot.booked ? 'Booked' : 'Blocked'}
                                </div>
                              </div>
                            </Label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 sm:py-8 text-gray-500 bg-gray-50 rounded-xl">
                        <i className="fas fa-calendar-plus text-xl sm:text-2xl mb-2"></i>
                        <p className="text-sm sm:text-base">Please select sport and date to view available slots</p>
                      </div>
                    )}
                    {form.formState.errors.timeSlots && (
                      <p className="text-red-500 text-xs sm:text-sm flex items-center">
                        <i className="fas fa-exclamation-circle mr-1"></i>
                        {form.formState.errors.timeSlots.message}
                      </p>
                    )}
                  </div>

                  {/* Speed Meter Add-on */}
                  <div className="space-y-4">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                        <i className="fas fa-tachometer-alt text-primary text-sm sm:text-base"></i>
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Add-ons</h3>
                        <p className="text-gray-600 text-xs sm:text-sm">Enhance your experience</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                      <input
                        type="checkbox"
                        id="speedMeter"
                        checked={speedMeter}
                        onChange={e => setSpeedMeter(e.target.checked)}
                        className="w-4 h-4 sm:w-5 sm:h-5 mr-3 text-primary focus:ring-primary/20"
                        disabled={pricesLoading || !prices || !('speedMeter' in prices)}
                      />
                      <Label htmlFor="speedMeter" className="text-gray-700 font-medium cursor-pointer flex-1">
                        <div className="font-semibold text-sm sm:text-base">Speed Meter</div>
                        <div className="text-xs sm:text-sm text-gray-600">Check ball speed during play</div>
                      </Label>
                      {prices && prices['speedMeter'] && (
                        <div className="text-primary font-semibold text-sm sm:text-base">+₹{prices['speedMeter']}</div>
                      )}
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Summary Sidebar - Mobile Optimized */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="lg:sticky lg:top-8">
              <Card className="shadow-2xl border-0 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-primary/20">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary/20 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                      <i className="fas fa-receipt text-primary text-sm sm:text-base"></i>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Booking Summary</h3>
                  </div>

                  {selectedFacility ? (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm sm:text-base">Facility:</span>
                        <span className="font-semibold capitalize text-sm sm:text-base">{facilityOptions.find(opt => opt.id === selectedFacility)?.label || selectedFacility}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm sm:text-base">Duration:</span>
                        <span className="font-semibold text-sm sm:text-base">
                          {slotCount} {selectedFacility === 'airhockey' ? '30-min slot(s)' : 'hour(s)'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-gray-600">Base Price:</span>
                        <span className="font-semibold">
                          ₹{prices && prices[selectedFacility] ? prices[selectedFacility] : 0} x {slotCount} = ₹{prices && prices[selectedFacility] ? 
                            (selectedFacility === 'airhockey' ? prices[selectedFacility] * 0.5 * slotCount : prices[selectedFacility] * slotCount) : 0}
                        </span>
                      </div>
                      
                      {speedMeter && prices && prices['speedMeter'] && (
                        <div className="flex justify-between items-center text-xs sm:text-sm">
                          <span className="text-gray-600">Speed Meter:</span>
                          <span className="font-semibold">+₹{prices['speedMeter']} x {slotCount} = ₹{prices['speedMeter'] * slotCount}</span>
                        </div>
                      )}
                      
                      <div className="pt-3 sm:pt-4 border-t border-primary/20">
                        <div className="flex justify-between items-center text-lg sm:text-xl font-bold text-primary">
                          <span>Total Amount:</span>
                          <span>₹{totalAmount}</span>
                        </div>
                      </div>

                      {/* Submit Button - Mobile Optimized */}
                      <Button 
                        type="submit"
                        disabled={isProcessing}
                        onClick={form.handleSubmit(onSubmit)}
                        className="w-full bg-primary hover:bg-primary/90 text-white py-3 sm:py-4 h-auto text-base sm:text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-4 sm:mt-6"
                      >
                        {isProcessing ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-credit-card mr-2"></i>
                            Proceed to Payment
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8 text-gray-500">
                      <i className="fas fa-info-circle text-xl sm:text-2xl mb-2"></i>
                      <p className="text-sm sm:text-base">Select a facility to see pricing</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
        )}
      </div>
    </section>
  );
}
