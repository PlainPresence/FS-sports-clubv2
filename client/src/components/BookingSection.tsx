import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  sportType: z.enum(['cricket', 'football', 'badminton', 'basketball'], {
    required_error: 'Please select a sport',
  }),
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

  const form = useForm<any>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      fullName: '',
      mobile: '',
      email: '',
      teamName: '',
      sportType: 'cricket',
      date: '',
      timeSlots: [],
    },
  });

  const watchedSport = 'cricket';
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
      const amount = prices && data.sportType ? ((prices[data.sportType] * slotCount) + (speedMeter && prices['speedMeter'] ? prices['speedMeter'] * slotCount : 0)) : 0;
      const bookingData = {
        ...data,
        bookingId,
        amount,
        paymentStatus: 'pending',
        speedMeter,
        speedMeterPrice: speedMeter && prices && prices['speedMeter'] ? prices['speedMeter'] * data.timeSlots.length : 0,
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
              if (bookingResult.success) {
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
              } else if (bookingResult.reason === 'Slot already booked') {
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
                  reason: bookingResult.error || 'Unknown error',
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

  const selectedSport = 'cricket';
  const slotCount = watchedTimeSlots?.length || 0;
  const totalAmount = selectedSport && prices ? ((prices[selectedSport] * slotCount) + (speedMeter && prices['speedMeter'] ? prices['speedMeter'] * slotCount : 0)) : 0;

  return (
    <section id="booking" className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Book Your Slot</h2>
          <p className="text-xl text-gray-600">
            Fill in your details and secure your preferred time slot
          </p>
        </motion.div>

        {pricesLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <Card className="shadow-2xl border-0">
            <CardContent className="p-8 md:p-12">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700 mb-3 block">
                      Full Name *
                    </Label>
                    <Input
                      {...form.register('fullName')}
                      placeholder="Enter your full name"
                      className="h-12"
                    />
                    {form.formState.errors.fullName && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="mobile" className="text-sm font-semibold text-gray-700 mb-3 block">
                      Mobile Number *
                    </Label>
                    <Input
                      {...form.register('mobile')}
                      placeholder="+91 98765 43210"
                      type="tel"
                      className="h-12"
                    />
                    {form.formState.errors.mobile && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.mobile.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="teamName" className="text-sm font-semibold text-gray-700 mb-3 block">
                      Team Name (Optional)
                    </Label>
                    <Input
                      {...form.register('teamName')}
                      placeholder="Your team name"
                      className="h-12"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-3 block">
                      Email (Optional)
                    </Label>
                    <Input
                      {...form.register('email')}
                      placeholder="your@email.com"
                      type="email"
                      className="h-12"
                    />
                    {form.formState.errors.email && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  {/* Sport selection removed: always cricket */}

                  <div>
                    <Label htmlFor="date" className="text-sm font-semibold text-gray-700 mb-3 block">
                      Preferred Date *
                    </Label>
                    <Input
                      {...form.register('date')}
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      className="h-12"
                    />
                    {form.formState.errors.date && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.date.message}</p>
                    )}
                  </div>
                </div>

                {/* Time Slot Selection */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-4 block">
                    Available Time Slots *
                  </Label>
                  {slotsLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Shimmer key={i} className="h-16 rounded-xl" />
                      ))}
                    </div>
                  ) : slotsError ? (
                    <div className="text-center py-8 text-gray-500">
                      {slotsError}
                    </div>
                  ) : watchedDate && watchedSport ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {slots.map((slot, idx) => {
                        const checked = watchedTimeSlots?.includes(slot.time);
                        // Allow flexible selection: only disable if not available
                        const isDisabled = !slot.available;
                        return (
                          <Label key={slot.time} className={`cursor-pointer group ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}>
                            <input
                              type="checkbox"
                              value={slot.time}
                              checked={checked}
                              onChange={e => {
                                const value = slot.time;
                                let newSlots = watchedTimeSlots ? [...watchedTimeSlots] : [];
                                if (e.target.checked) {
                                  newSlots.push(value);
                                  // Sort slots by their order in the slots array
                                  newSlots = newSlots.sort((a, b) => slots.findIndex(s => s.time === a) - slots.findIndex(s => s.time === b));
                                } else {
                                  newSlots = newSlots.filter(s => s !== value);
                                }
                                form.setValue('timeSlots', newSlots);
                              }}
                              disabled={isDisabled}
                              className="sr-only peer"
                            />
                            <div className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                              checked
                                ? 'border-primary bg-primary/10'
                                : slot.available
                                  ? 'border-gray-200 group-hover:border-primary/50'
                                  : slot.booked
                                    ? 'border-gray-300 bg-gray-100'
                                    : 'border-red-200 bg-red-50'
                            }`}>
                              <div className={`font-bold ${
                                slot.available
                                  ? 'text-gray-900 group-hover:text-primary'
                                  : 'text-gray-400'
                              }`}>
                                {slot.display}
                              </div>
                              <div className={`text-sm font-semibold ${
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
                    <div className="text-center py-8 text-gray-500">
                      Please select sport and date to view available slots
                    </div>
                  )}
                  {form.formState.errors.timeSlots && (
                    <p className="text-red-500 text-sm mt-3">{form.formState.errors.timeSlots.message}</p>
                  )}
                </div>

                {/* Speed Meter Add-on */}
                <div className="flex items-center mt-4">
                  <input
                    type="checkbox"
                    id="speedMeter"
                    checked={speedMeter}
                    onChange={e => setSpeedMeter(e.target.checked)}
                    className="w-5 h-5 mr-2"
                    disabled={pricesLoading || !prices || !('speedMeter' in prices)}
                  />
                  <Label htmlFor="speedMeter" className="text-gray-700 font-medium cursor-pointer">
                    Add Speed Meter (Check ball speed)
                    {prices && prices['speedMeter'] ? ` (+₹${prices['speedMeter']})` : ''}
                  </Label>
                </div>

                {/* Pricing Summary */}
                {selectedSport && (
                  <div className="p-6 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700">Selected Sport:</span>
                      <span className="font-semibold capitalize">{selectedSport}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700">Duration:</span>
                      <span className="font-semibold">{slotCount} Hour(s)</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700">Selected Slots:</span>
                      <span className="font-semibold">{watchedTimeSlots?.join(', ')}</span>
                    </div>
                    {speedMeter && prices && prices['speedMeter'] && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-700">Add-on:</span>
                        <span className="font-semibold">Speed Meter (+₹{prices['speedMeter']} x {slotCount} hour{slotCount > 1 ? 's' : ''} = ₹{prices['speedMeter'] * slotCount})</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xl font-bold text-primary">
                      <span>Total Amount:</span>
                      <span>₹{totalAmount}</span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="text-center">
                  <Button 
                    type="submit"
                    disabled={isProcessing}
                    className="bg-primary hover:bg-primary/90 text-white px-12 py-4 h-auto text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isProcessing ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Proceed to Payment
                        <i className="fas fa-credit-card ml-2"></i>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
        )}
      </div>
    </section>
  );
}
