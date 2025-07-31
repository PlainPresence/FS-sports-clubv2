import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getTournaments, createTournamentBooking, updateTournamentSlots } from '@/lib/firebase';
import { sendBookingConfirmation } from '@/lib/emailjs';
import { sendWhatsAppNotification } from '@/lib/whatsapp';
import { Tournament } from '@/types';
import LoadingSpinner from './LoadingSpinner';

interface QuickTeamBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickTeamBookingModal({ isOpen, onClose, onSuccess }: QuickTeamBookingModalProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    tournamentId: '',
    teamName: '',
    captainName: '',
    captainMobile: '',
    captainEmail: '',
    teamMembers: [''],
    amount: 0,
  });

  // Fetch tournaments when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTournaments();
      setFormData({
        tournamentId: '',
        teamName: '',
        captainName: '',
        captainMobile: '',
        captainEmail: '',
        teamMembers: [''],
        amount: 0,
      });
    }
  }, [isOpen]);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const tournamentsData = await getTournaments();
      setTournaments(tournamentsData.filter(t => t.status === 'upcoming' && t.remainingSlots > 0));
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tournaments.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateBookingId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `QTB${timestamp}${randomStr}`.toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isProcessing) {
      console.log('Quick tournament booking already in progress, preventing double submission');
      return;
    }
    
    if (!formData.tournamentId || !formData.teamName || !formData.captainName || !formData.captainMobile || formData.amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields with valid values.',
        variant: 'destructive',
      });
      return;
    }

    const selectedTournament = tournaments.find(t => t.id === formData.tournamentId);
    if (!selectedTournament) {
      toast({
        title: 'Error',
        description: 'Selected tournament not found.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedTournament.remainingSlots <= 0) {
      toast({
        title: 'Error',
        description: 'No slots available for this tournament.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const bookingData = {
        bookingId: generateBookingId(),
        tournamentId: formData.tournamentId,
        teamName: formData.teamName,
        captainName: formData.captainName,
        captainMobile: formData.captainMobile,
        captainEmail: formData.captainEmail || '',
        teamMembers: formData.teamMembers.filter(member => member.trim() !== ''),
        amount: formData.amount,
        paymentStatus: 'success', // Admin booking is automatically confirmed
        bookingDate: new Date(),
        status: 'confirmed',
        tournamentName: selectedTournament.name,
        sportType: selectedTournament.sportType,
        isAdminBooking: true, // Flag to identify admin-created bookings
      };

      console.log('Creating quick tournament booking with data:', bookingData);

      const result = await fetch('/api/book-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: bookingData.tournamentId, // Use tournamentId as date for uniqueness
          sportType: bookingData.sportType || 'tournament',
          timeSlots: ['team'],
          bookingData,
        }),
      }).then(res => res.json());
      
      if (result.success) {
        // Update tournament remaining slots
        await updateTournamentSlots(formData.tournamentId, selectedTournament.remainingSlots - 1);

        // Send notifications
        if (formData.captainEmail) {
          await sendBookingConfirmation(bookingData);
        }
        sendWhatsAppNotification(bookingData);

        toast({
          title: 'Tournament Booking Created Successfully!',
          description: `Booking ID: ${bookingData.bookingId}. WhatsApp confirmation sent to captain.`,
        });

        onSuccess();
        onClose();
      } else {
        toast({
          title: 'Booking Failed',
          description: result.error || 'Failed to create tournament booking.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Quick tournament booking error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create tournament booking. Please try again.',
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

  const addTeamMember = () => {
    setFormData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, '']
    }));
  };

  const removeTeamMember = (index: number) => {
    if (formData.teamMembers.length > 1) {
      setFormData(prev => ({
        ...prev,
        teamMembers: prev.teamMembers.filter((_, i) => i !== index)
      }));
    }
  };

  const updateTeamMember = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.map((member, i) => i === index ? value : member)
    }));
  };

  const handleTournamentChange = (tournamentId: string) => {
    const selectedTournament = tournaments.find(t => t.id === tournamentId);
    setFormData(prev => ({
      ...prev,
      tournamentId,
      amount: selectedTournament?.teamPrice || 0
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Quick Team Booking</h2>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              <i className="fas fa-times text-xl"></i>
            </Button>
          </div>
          <p className="text-gray-600 mt-2">Register a team for tournament directly from admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tournament Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Tournament Selection</h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : tournaments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No available tournaments found.
              </div>
            ) : (
              <div>
                <Label htmlFor="tournamentId" className="text-sm font-semibold text-gray-700">
                  Select Tournament *
                </Label>
                <select
                  id="tournamentId"
                  value={formData.tournamentId}
                  onChange={(e) => handleTournamentChange(e.target.value)}
                  className="w-full h-12 border border-gray-200 rounded-lg focus:border-primary focus:ring-primary/20 px-3"
                  required
                >
                  <option value="">Choose a tournament</option>
                  {tournaments.map((tournament) => (
                    <option key={tournament.id} value={tournament.id}>
                      🏆 {tournament.name} - {tournament.sportType} (₹{tournament.teamPrice}, {tournament.remainingSlots} slots left)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Team Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Team Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teamName" className="text-sm font-semibold text-gray-700">
                  Team Name *
                </Label>
                <Input
                  id="teamName"
                  value={formData.teamName}
                  onChange={(e) => handleInputChange('teamName', e.target.value)}
                  placeholder="Enter team name"
                  className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>

              <div>
                <Label htmlFor="captainName" className="text-sm font-semibold text-gray-700">
                  Captain Name *
                </Label>
                <Input
                  id="captainName"
                  value={formData.captainName}
                  onChange={(e) => handleInputChange('captainName', e.target.value)}
                  placeholder="Team captain name"
                  className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="captainMobile" className="text-sm font-semibold text-gray-700">
                  Captain Mobile *
                </Label>
                <Input
                  id="captainMobile"
                  value={formData.captainMobile}
                  onChange={(e) => handleInputChange('captainMobile', e.target.value)}
                  placeholder="Captain's mobile number"
                  className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>

              <div>
                <Label htmlFor="captainEmail" className="text-sm font-semibold text-gray-700">
                  Captain Email (Optional)
                </Label>
                <Input
                  id="captainEmail"
                  type="email"
                  value={formData.captainEmail}
                  onChange={(e) => handleInputChange('captainEmail', e.target.value)}
                  placeholder="Captain's email address"
                  className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
              <Button
                type="button"
                onClick={addTeamMember}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm"
              >
                <i className="fas fa-plus mr-2"></i>
                Add Member
              </Button>
            </div>

            {formData.teamMembers.map((member, index) => (
              <div key={index} className="flex items-center space-x-3">
                <Input
                  value={member}
                  onChange={(e) => updateTeamMember(index, e.target.value)}
                  placeholder={`Team member ${index + 1} name`}
                  className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                />
                {formData.teamMembers.length > 1 && (
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
          </div>

          {/* Payment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Payment</h3>
            
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
                    ₹{formData.amount}
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
              disabled={isProcessing || tournaments.length === 0}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating Booking...
                </>
              ) : (
                <>
                  <i className="fas fa-trophy mr-2"></i>
                  Register Team
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
} 
