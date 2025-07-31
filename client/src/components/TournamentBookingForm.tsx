import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { initiateCashfreePayment } from '@/lib/cashfree';
import { getTournament, createTournamentBooking, updateTournamentSlots } from '@/lib/firebase';
import { sendBookingConfirmation } from '@/lib/emailjs';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import { Tournament, TournamentFormData } from '@/types';
import LoadingSpinner from './LoadingSpinner';

const tournamentBookingSchema = z.object({
  teamName: z.string().min(2, 'Team name must be at least 2 characters'),
  captainName: z.string().min(2, 'Captain name must be at least 2 characters'),
  captainMobile: z.string().regex(/^[+]?\d{10,14}$/, 'Invalid mobile number'),
  captainEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  teamMembers: z.array(z.string()).min(1, 'At least one team member is required'),
  tournamentId: z.string().min(1, 'Tournament is required'),
});

interface TournamentBookingFormProps {
  tournamentId: string;
  onBookingSuccess: (bookingData: any) => void;
}

export default function TournamentBookingForm({ tournamentId, onBookingSuccess }: TournamentBookingFormProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState(['']);

  const form = useForm<z.infer<typeof tournamentBookingSchema>>({
    resolver: zodResolver(tournamentBookingSchema),
    defaultValues: {
      teamName: '',
      captainName: '',
      captainMobile: '',
      captainEmail: '',
      teamMembers: [''],
      tournamentId,
    },
  });

  useEffect(() => {
    const fetchTournament = async () => {
      setLoading(true);
      try {
        const tournamentData = await getTournament(tournamentId);
        if (tournamentData && typeof tournamentData === 'object' && 'name' in tournamentData) {
          setTournament(tournamentData as Tournament);
          form.setValue('tournamentId', tournamentId);
        } else {
          toast({
            title: 'Tournament Not Found',
            description: 'The tournament you are looking for does not exist.',
            variant: 'destructive',
          });
          setLocation('/tournaments');
        }
      } catch (error) {
        console.error('Error fetching tournament:', error);
        toast({
          title: 'Error',
          description: 'Failed to load tournament details.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, [tournamentId, form, toast, setLocation]);

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, '']);
  };

  const removeTeamMember = (index: number) => {
    if (teamMembers.length > 1) {
      const newMembers = teamMembers.filter((_, i) => i !== index);
      setTeamMembers(newMembers);
      form.setValue('teamMembers', newMembers.filter(member => member.trim() !== ''));
    }
  };

  const updateTeamMember = (index: number, value: string) => {
    const newMembers = [...teamMembers];
    newMembers[index] = value;
    setTeamMembers(newMembers);
    form.setValue('teamMembers', newMembers.filter(member => member.trim() !== ''));
  };

  const generateBookingId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `TRN${timestamp}${randomStr}`.toUpperCase();
  };

  const onSubmit = async (data: TournamentFormData) => {
    if (!tournament) return;

    setIsProcessing(true);
    try {
      const bookingId = generateBookingId();
      const amount = tournament.teamPrice;

      const bookingData = {
        ...data,
        bookingId,
        amount,
        paymentStatus: 'pending',
        tournamentId,
        tournamentName: tournament.name,
        sportType: tournament.sportType,
      };

      // 1. Create Cashfree payment session
      const sessionRes = await fetch('/api/cashfree/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: bookingData.bookingId,
          amount: bookingData.amount,
          customerDetails: {
            customer_id: bookingData.bookingId,
            customer_email: bookingData.captainEmail,
            customer_phone: bookingData.captainMobile,
            customer_name: bookingData.captainName,
          },
          slotInfo: {
            tournamentId: bookingData.tournamentId,
            tournamentName: bookingData.tournamentName,
            sportType: bookingData.sportType,
            bookingId: bookingData.bookingId,
            teamName: bookingData.teamName,
            teamMembers: bookingData.teamMembers,
            date: tournament?.startDate || new Date().toISOString().split('T')[0],
            timeSlots: ['Tournament'],
          }
        }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionData.paymentSessionId) throw new Error('Failed to create payment session');
      // 2. Launch Cashfree payment UI
      await initiateCashfreePayment(sessionData.paymentSessionId, bookingData.bookingId);
      // Payment confirmation and booking creation will be handled by webhook
      // User will be redirected to confirmation page after payment
    } catch (error) {
      console.error('Tournament booking error:', error);
      toast({
        title: 'Error',
        description: 'Booking failed. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!tournament) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8"
      >
        {/* Tournament Info */}
        <div className="lg:col-span-1">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm sticky top-6">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <span className="text-4xl mb-4 block">🏆</span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{tournament.name}</h3>
                <p className="text-gray-600 text-sm capitalize">{tournament.sportType}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Team Price:</span>
                  <span className="font-bold text-primary text-xl">₹{tournament.teamPrice}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Available Slots:</span>
                  <span className="font-semibold text-gray-900">{tournament.remainingSlots}/{tournament.maxTeams}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Start Date:</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(tournament.startDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Deadline:</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(tournament.registrationDeadline).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-primary/10 rounded-xl">
                <h4 className="font-semibold text-gray-900 mb-2">Tournament Details</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {tournament.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Booking Form */}
        <div className="lg:col-span-2">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                  <i className="fas fa-users text-primary"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Team Registration</h3>
                  <p className="text-gray-600 text-sm">Register your team for the tournament</p>
                </div>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Team Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 text-lg">Team Information</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="teamName" className="text-sm font-semibold text-gray-700">
                      Team Name *
                    </Label>
                    <Input
                      {...form.register('teamName')}
                      id="teamName"
                      placeholder="Enter your team name"
                      className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                    {form.formState.errors.teamName && (
                      <p className="text-red-500 text-sm">{form.formState.errors.teamName.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="captainName" className="text-sm font-semibold text-gray-700">
                        Captain Name *
                      </Label>
                      <Input
                        {...form.register('captainName')}
                        id="captainName"
                        placeholder="Team captain name"
                        className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                      />
                      {form.formState.errors.captainName && (
                        <p className="text-red-500 text-sm">{form.formState.errors.captainName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="captainMobile" className="text-sm font-semibold text-gray-700">
                        Captain Mobile *
                      </Label>
                      <Input
                        {...form.register('captainMobile')}
                        id="captainMobile"
                        placeholder="Captain's mobile number"
                        className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                      />
                      {form.formState.errors.captainMobile && (
                        <p className="text-red-500 text-sm">{form.formState.errors.captainMobile.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="captainEmail" className="text-sm font-semibold text-gray-700">
                      Captain Email (Optional)
                    </Label>
                    <Input
                      {...form.register('captainEmail')}
                      id="captainEmail"
                      type="email"
                      placeholder="Captain's email address"
                      className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                    />
                    {form.formState.errors.captainEmail && (
                      <p className="text-red-500 text-sm">{form.formState.errors.captainEmail.message}</p>
                    )}
                  </div>
                </div>

                {/* Team Members */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 text-lg">Team Members</h4>
                    <Button
                      type="button"
                      onClick={addTeamMember}
                      className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Add Member
                    </Button>
                  </div>

                  {teamMembers.map((member, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Input
                        value={member}
                        onChange={(e) => updateTeamMember(index, e.target.value)}
                        placeholder={`Team member ${index + 1} name`}
                        className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                      />
                      {teamMembers.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeTeamMember(index)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg"
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      )}
                    </div>
                  ))}
                  {form.formState.errors.teamMembers && (
                    <p className="text-red-500 text-sm">{form.formState.errors.teamMembers.message}</p>
                  )}
                </div>

                {/* Payment Summary */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 text-lg mb-4">Payment Summary</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Tournament Registration:</span>
                      <span className="font-semibold text-gray-900">₹{tournament.teamPrice}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 text-lg">Total Amount:</span>
                        <span className="font-bold text-primary text-xl">₹{tournament.teamPrice}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isProcessing || tournament.remainingSlots === 0}
                  className={`w-full h-14 text-lg font-bold ${
                    tournament.remainingSlots === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Processing Payment...
                    </>
                  ) : tournament.remainingSlots === 0 ? (
                    'Tournament Full'
                  ) : (
                    <>
                      <span className="mr-2">💳</span>
                      Pay ₹{tournament.teamPrice} & Register Team
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
} 
