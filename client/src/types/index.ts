export interface SportInfo {
  id: string;
  name: string;
  icon: string;
  price: number;
  description: string;
  color: string;
}

export interface TimeSlot {
  time: string;
  display: string;
  available: boolean;
  booked: boolean;
  blocked: boolean;
}

export interface BookingFormData {
  fullName: string;
  mobile: string;
  email?: string;
  teamName?: string;
  facilityTypes: string[]; // e.g., ['cricket', 'snooker', 'pool', 'airhockey']
  date: string;
  timeSlots: string[]; // Multi-hour booking support
  // sportType: string; // Deprecated
}

export interface BookingData extends BookingFormData {
  id?: string; // Firestore document id
  bookingId: string;
  sportType: string; // Add sportType field for consistency
  amount: number;
  paymentStatus: 'pending' | 'success' | 'failed' | 'cancelled';
  paymentId?: string;
  timeSlot?: string; // Keep for backward compatibility
  createdAt?: Date;
  cashfreeOrderId?: string;
  cashfreePaymentId?: string;
  cashfreePaymentStatus?: string;
}

export interface AdminUser {
  uid: string;
  email: string;
}

export interface TournamentBooking extends Omit<BookingData, 'timeSlots' | 'facilityTypes'> {
  tournamentId: string;
  tournamentName: string;
  teamName: string;
  captainName: string;
  captainMobile: string;
  captainEmail?: string;
  teamMembers: string[];
  bookingType: 'tournament';
  timeSlots: ['Tournament'];
}

export interface Tournament {
  id?: string;
  name: string;
  description: string;
  sportType: string;
  teamPrice: number;
  maxTeams: number;
  remainingSlots: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentBooking {
  id: string;
  tournamentId: string;
  teamName: string;
  captainName: string;
  captainMobile: string;
  captainEmail?: string;
  teamMembers: string[];
  paymentStatus: 'pending' | 'success' | 'failed';
  amount: number;
  bookingDate: Date;
  status: 'confirmed' | 'cancelled';
}

export interface TournamentFormData {
  teamName: string;
  captainName: string;
  captainMobile: string;
  captainEmail?: string;
  teamMembers: string[];
  tournamentId: string;
}
