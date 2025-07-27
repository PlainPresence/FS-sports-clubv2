import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'wouter';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Tournament } from '@/types';
import { getTournaments } from '@/lib/firebase';

export default function TournamentBooking() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      try {
        const tournamentsData = await getTournaments();
        setTournaments(tournamentsData);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const handleBookTournament = (tournamentId: string) => {
    navigate(`/tournament/${tournamentId}/book`);
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

  const getSportIcon = (sportType: string) => {
    switch (sportType.toLowerCase()) {
      case 'cricket': return '🏏';
      case 'football': return '⚽';
      case 'basketball': return '🏀';
      case 'volleyball': return '🏐';
      case 'badminton': return '🏸';
      case 'tennis': return '🎾';
      default: return '🏆';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-teal-100">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-20 pb-12 sm:pt-24 sm:pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-2xl shadow-lg mb-6">
              <span className="text-3xl sm:text-4xl">🏆</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Tournament <span className="text-primary">Bookings</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Join exciting tournaments and compete with the best teams. Book your spot now and showcase your skills!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tournaments Section */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : tournaments.length === 0 ? (
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/50">
                <span className="text-6xl mb-4 block">🏆</span>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">No Tournaments Available</h3>
                <p className="text-gray-600 mb-6">
                  Check back later for upcoming tournaments and exciting competitions!
                </p>
                <button 
                  onClick={() => navigate('/')}
                  className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {tournaments.map((tournament, index) => (
                <motion.div
                  key={tournament.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  {/* Tournament Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl">{getSportIcon(tournament.sportType)}</span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{tournament.name}</h3>
                        <p className="text-sm text-gray-600 capitalize">{tournament.sportType}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(tournament.status)}`}>
                      {tournament.status}
                    </span>
                  </div>

                  {/* Tournament Description */}
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {tournament.description}
                  </p>

                  {/* Tournament Details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Team Price:</span>
                      <span className="font-bold text-primary text-lg">₹{tournament.teamPrice}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Available Slots:</span>
                      <span className="font-semibold text-gray-900">{tournament.remainingSlots}/{tournament.maxTeams}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Start Date:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(tournament.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-sm">Registration Deadline:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(tournament.registrationDeadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                      <span>Registration Progress</span>
                      <span>{Math.round(((tournament.maxTeams - tournament.remainingSlots) / tournament.maxTeams) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((tournament.maxTeams - tournament.remainingSlots) / tournament.maxTeams) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Book Button */}
                  <button
                    onClick={() => handleBookTournament(tournament.id)}
                    disabled={tournament.remainingSlots === 0 || tournament.status !== 'upcoming'}
                    className={`w-full py-3 px-6 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-105 ${
                      tournament.remainingSlots === 0 || tournament.status !== 'upcoming'
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {tournament.remainingSlots === 0 ? (
                      'Fully Booked'
                    ) : tournament.status !== 'upcoming' ? (
                      'Registration Closed'
                    ) : (
                      <>
                        <span className="mr-2">📅</span>
                        Book Team Slot
                      </>
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="bg-gradient-to-r from-primary to-secondary rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-white text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Compete?</h3>
            <p className="text-lg sm:text-xl mb-8 opacity-90">
              Join our tournaments and showcase your team's skills. Don't miss out on the excitement!
            </p>
            <button 
              onClick={() => navigate('/')}
              className="bg-white text-primary px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <span className="mr-2">🏠</span>
              Back to Home
            </button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
} 