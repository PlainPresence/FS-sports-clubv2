import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  getTournaments, 
  createTournament, 
  updateTournament, 
  deleteTournament,
  getTournamentBookings 
} from '@/lib/firebase';
import { Tournament, TournamentBooking } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminTournamentManagement() {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [bookings, setBookings] = useState<TournamentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tournaments' | 'bookings'>('tournaments');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sportType: 'cricket',
    teamPrice: 0,
    maxTeams: 0,
    remainingSlots: 0,
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    status: 'upcoming'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tournamentsData, bookingsData] = await Promise.all([
        getTournaments(),
        getTournamentBookings()
      ]);
      setTournaments(tournamentsData);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tournament data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async () => {
    if (!formData.name || !formData.description || formData.teamPrice <= 0 || formData.maxTeams <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields with valid values.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
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
        resetForm();
        fetchData();
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
      setIsCreating(false);
    }
  };

  const handleUpdateTournament = async (tournamentId: string) => {
    if (!formData.name || !formData.description || formData.teamPrice <= 0 || formData.maxTeams <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields with valid values.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const updates = {
        ...formData,
        teamPrice: Number(formData.teamPrice),
        maxTeams: Number(formData.maxTeams),
      };

      const result = await updateTournament(tournamentId, updates);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Tournament updated successfully!',
        });
        resetForm();
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update tournament.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tournament.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (window.confirm('Are you sure you want to delete this tournament?')) {
      try {
        const result = await deleteTournament(tournamentId);
        if (result.success) {
          toast({
            title: 'Success',
            description: 'Tournament deleted successfully!',
          });
          fetchData();
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to delete tournament.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete tournament.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleEdit = (tournament: Tournament) => {
    setEditingId(tournament.id);
    setFormData({
      name: tournament.name,
      description: tournament.description,
      sportType: tournament.sportType,
      teamPrice: tournament.teamPrice,
      maxTeams: tournament.maxTeams,
      remainingSlots: tournament.remainingSlots,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      registrationDeadline: tournament.registrationDeadline,
      status: tournament.status
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      sportType: 'cricket',
      teamPrice: 0,
      maxTeams: 0,
      remainingSlots: 0,
      startDate: '',
      endDate: '',
      registrationDeadline: '',
      status: 'upcoming'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Tournament Management</h2>
        <div className="flex space-x-2">
          <Button
            onClick={() => setActiveTab('tournaments')}
            variant={activeTab === 'tournaments' ? 'default' : 'outline'}
          >
            Tournaments
          </Button>
          <Button
            onClick={() => setActiveTab('bookings')}
            variant={activeTab === 'bookings' ? 'default' : 'outline'}
          >
            Bookings
          </Button>
        </div>
      </div>

      {activeTab === 'tournaments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create/Edit Form */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingId ? 'Edit Tournament' : 'Create New Tournament'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Tournament Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter tournament name"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter tournament description"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary/20"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sportType">Sport Type</Label>
                    <select
                      id="sportType"
                      value={formData.sportType}
                      onChange={(e) => setFormData({ ...formData, sportType: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary/20"
                    >
                      <option value="cricket">Cricket</option>
                      <option value="football">Football</option>
                      <option value="basketball">Basketball</option>
                      <option value="volleyball">Volleyball</option>
                      <option value="badminton">Badminton</option>
                      <option value="tennis">Tennis</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary/20"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="teamPrice">Team Price (₹) *</Label>
                    <Input
                      id="teamPrice"
                      type="number"
                      value={formData.teamPrice}
                      onChange={(e) => setFormData({ ...formData, teamPrice: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="maxTeams">Max Teams *</Label>
                    <Input
                      id="maxTeams"
                      type="number"
                      value={formData.maxTeams}
                      onChange={(e) => setFormData({ ...formData, maxTeams: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="registrationDeadline">Registration Deadline</Label>
                    <Input
                      id="registrationDeadline"
                      type="date"
                      value={formData.registrationDeadline}
                      onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  {editingId ? (
                    <>
                      <Button
                        onClick={() => handleUpdateTournament(editingId)}
                        className="flex-1"
                      >
                        Update Tournament
                      </Button>
                      <Button
                        onClick={resetForm}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={handleCreateTournament}
                      disabled={isCreating}
                      className="flex-1"
                    >
                      {isCreating ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Creating...
                        </>
                      ) : (
                        'Create Tournament'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tournaments List */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Tournaments</h3>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {tournaments.map((tournament) => (
                  <motion.div
                    key={tournament.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{tournament.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">{tournament.sportType}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(tournament.status)}`}>
                        {tournament.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{tournament.description}</p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                      <span>₹{tournament.teamPrice}</span>
                      <span>{tournament.remainingSlots}/{tournament.maxTeams} slots</span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleEdit(tournament)}
                        size="sm"
                        variant="outline"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteTournament(tournament.id)}
                        size="sm"
                        variant="destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </motion.div>
                ))}
                
                {tournaments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No tournaments found. Create your first tournament!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'bookings' && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Tournament Bookings</h3>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {bookings.map((booking) => (
                <motion.div
                  key={booking.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{booking.teamName}</h4>
                      <p className="text-sm text-gray-600">Captain: {booking.captainName}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      booking.paymentStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {booking.paymentStatus}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                                         <p>Tournament: {booking.tournamentId}</p>
                     <p>Amount: ₹{booking.amount}</p>
                     <p>Booking ID: {booking.id}</p>
                    <p>Date: {new Date(booking.bookingDate).toLocaleDateString()}</p>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    <p>Team Members: {booking.teamMembers.join(', ')}</p>
                  </div>
                </motion.div>
              ))}
              
              {bookings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No tournament bookings found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 
