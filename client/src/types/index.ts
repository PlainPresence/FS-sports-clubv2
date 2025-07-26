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
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  timeSlot?: string; // Keep for backward compatibility
  createdAt?: Date;
}

export interface AdminUser {
  uid: string;
  email: string;
}
