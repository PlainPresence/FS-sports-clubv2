import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createTournament } from '@/lib/firebase';
import LoadingSpinner from './LoadingSpinner';

interface TournamentCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const sports = [
  { id: 'cricket', label: 'Cricket', icon: '🏏' },
  { id: 'football', label: 'Football', icon: '⚽' },
  { id: 'basketball', label: 'Basketball', icon: '🏀' },
  { id: 'volleyball', label: 'Volleyball', icon: '🏐' },
  { id: 'badminton', label: 'Badminton', icon: '🏸' },
  { id: 'tennis', label: 'Tennis', icon: '🎾' },
];

export default function TournamentCreationModal({ isOpen, onClose, onSuccess }: TournamentCreationModalProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sportType: 'cricket',
    teamPrice: 0,
    maxTeams: 0,
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    status: 'upcoming'
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        sportType: 'cricket',
        teamPrice: 0,
        maxTeams: 0,
        startDate: '',
        endDate: '',
        registrationDeadline: '',
        status: 'upcoming'
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || formData.teamPrice <= 0 || formData.maxTeams <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields with valid values.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const tournamentData = {
        ...formData,
        remainingSlots: formData.maxTeams, // Initially, all slots are available
        teamPrice: Number(formData.teamPrice),
        maxTeams: Number(formData.maxTeams),
      };

      const result = await createTournament(tournamentData);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Tournament created successfully!',
        });
        onSuccess();
        onClose();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create tournament.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create tournament.',
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
            <h2 className="text-2xl font-bold text-gray-900">Create New Tournament</h2>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              <i className="fas fa-times text-xl"></i>
            </Button>
          </div>
          <p className="text-gray-600 mt-2">Create a new tournament for teams to register</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tournament Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Tournament Information</h3>
            
            <div>
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                Tournament Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter tournament name"
                className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
                Description *
              </Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter tournament description"
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary/20"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sportType" className="text-sm font-semibold text-gray-700">
                  Sport Type
                </Label>
                <select
                  id="sportType"
                  value={formData.sportType}
                  onChange={(e) => handleInputChange('sportType', e.target.value)}
                  className="w-full h-12 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary/20 px-3"
                >
                  {sports.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {sport.icon} {sport.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="status" className="text-sm font-semibold text-gray-700">
                  Status
                </Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full h-12 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary/20 px-3"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing & Capacity */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Pricing & Capacity</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teamPrice" className="text-sm font-semibold text-gray-700">
                  Team Price (₹) *
                </Label>
                <Input
                  id="teamPrice"
                  type="number"
                  value={formData.teamPrice}
                  onChange={(e) => handleInputChange('teamPrice', Number(e.target.value))}
                  placeholder="0"
                  className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>

              <div>
                <Label htmlFor="maxTeams" className="text-sm font-semibold text-gray-700">
                  Maximum Teams *
                </Label>
                <Input
                  id="maxTeams"
                  type="number"
                  value={formData.maxTeams}
                  onChange={(e) => handleInputChange('maxTeams', Number(e.target.value))}
                  placeholder="0"
                  className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                  required
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Tournament Dates</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-sm font-semibold text-gray-700">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                />
              </div>

              <div>
                <Label htmlFor="endDate" className="text-sm font-semibold text-gray-700">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                />
              </div>

              <div>
                <Label htmlFor="registrationDeadline" className="text-sm font-semibold text-gray-700">
                  Registration Deadline
                </Label>
                <Input
                  id="registrationDeadline"
                  type="date"
                  value={formData.registrationDeadline}
                  onChange={(e) => handleInputChange('registrationDeadline', e.target.value)}
                  className="h-12 border-gray-200 focus:border-primary focus:ring-primary/20"
                />
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
                  Creating Tournament...
                </>
              ) : (
                <>
                  <i className="fas fa-trophy mr-2"></i>
                  Create Tournament
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
} 