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
  sportType: string;
  date: string;
  timeSlots: string[]; // Multi-hour booking support
  // timeSlot: string; // Deprecated
}

export interface BookingData extends BookingFormData {
  id?: string; // Firestore document id
  bookingId: string;
  amount: number;
  paymentStatus: 'pending' | 'success' | 'failed' | 'cancelled';
  paymentId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt?: Date;
}

export interface AdminUser {
  uid: string;
  email: string;
}
