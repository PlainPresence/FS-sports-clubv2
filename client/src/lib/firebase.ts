import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, Timestamp, doc, updateDoc, setDoc, QueryDocumentSnapshot, runTransaction, getDoc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Safe string helper
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

export const loginAdmin = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: safeString(error?.message) || 'Login failed' };
  }
};

export const logoutAdmin = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: safeString(error?.message) || 'Logout failed' };
  }
};

export const createBooking = async (bookingData: any) => {
  try {
    const docRef = await addDoc(collection(db, "bookings"), {
      ...bookingData,
      createdAt: Timestamp.now(),
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    return { success: false, error: safeString(error?.message) || 'Failed to create booking' };
  }
};

export const getBookings = async (filters?: { date?: string; search?: string }) => {
  try {
    let q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    
    if (filters?.date) {
      q = query(collection(db, "bookings"), where("date", "==", safeString(filters.date)), orderBy("createdAt", "desc"));
    }
    
    const querySnapshot = await getDocs(q);
    const bookings = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    if (filters?.search) {
      const searchTerm = safeString(filters.search).toLowerCase();
      return bookings.filter((booking: any) => 
        safeString(booking.mobile).includes(filters.search!) || 
        safeString(booking.bookingId).includes(filters.search!) ||
        safeString(booking.fullName).toLowerCase().includes(searchTerm)
      );
    }

    return bookings;
  } catch (error: any) {
    throw new Error(safeString(error?.message) || 'Failed to fetch bookings');
  }
};

export const updateBooking = async (bookingId: string, updates: Partial<{ amount: number; paymentStatus: string }>) => {
  try {
    const bookingRef = doc(db, "bookings", safeString(bookingId));
    await updateDoc(bookingRef, updates);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: safeString(error?.message) || 'Failed to update booking' };
  }
};

export const getAvailableSlots = async (date: string, sportType: string) => {
  try {
    const safeDate = safeString(date);
    const safeSportType = safeString(sportType);
    
    // Get existing bookings
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("date", "==", safeDate),
      where("sportType", "==", safeSportType),
      where("paymentStatus", "==", "success")
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const bookedSlots = bookingsSnapshot.docs.map((doc: any) => safeString(doc.data().timeSlot));

    // Get blocked slots
    const blockedSlotsQuery = query(
      collection(db, "blockedSlots"),
      where("date", "==", safeDate),
      where("sportType", "==", safeSportType)
    );
    const blockedSlotsSnapshot = await getDocs(blockedSlotsQuery);
    const blockedSlots = blockedSlotsSnapshot.docs.map((doc: any) => safeString(doc.data().timeSlot));

    // Get blocked dates
    const blockedDatesQuery = query(
      collection(db, "blockedDates"),
      where("date", "==", safeDate)
    );
    const blockedDatesSnapshot = await getDocs(blockedDatesQuery);
    const isDateBlocked = !blockedDatesSnapshot.empty;

    return {
      bookedSlots,
      blockedSlots,
      isDateBlocked,
    };
  } catch (error: any) {
    throw new Error(safeString(error?.message) || 'Failed to fetch available slots');
  }
};

export const createBlockedSlot = async (slotData: any) => {
  try {
    const docRef = await addDoc(collection(db, "blockedSlots"), {
      ...slotData,
      createdAt: Timestamp.now(),
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    return { success: false, error: safeString(error?.message) || 'Failed to create blocked slot' };
  }
};

export const createBlockedDate = async (dateData: any) => {
  try {
    const docRef = await addDoc(collection(db, "blockedDates"), {
      ...dateData,
      createdAt: Timestamp.now(),
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    return { success: false, error: safeString(error?.message) || 'Failed to create blocked date' };
  }
};

export const getSlotPrices = async () => {
  try {
    const pricesSnapshot = await getDocs(collection(db, "slotPrices"));
    const prices: Record<string, number> = {};
    pricesSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && typeof data.price === 'number') {
        prices[docSnap.id] = data.price;
      }
    });
    return prices;
  } catch (error: any) {
    throw new Error(safeString(error?.message) || 'Failed to fetch slot prices');
  }
};

export const updateSlotPrice = async (sport: string, price: number) => {
  try {
    const safeSport = safeString(sport);
    const priceRef = doc(db, "slotPrices", safeSport);
    await updateDoc(priceRef, { price });
    return { success: true };
  } catch (error: any) {
    // If doc doesn't exist, create it
    if (error.code === 'not-found' || safeString(error?.message).includes('No document to update')) {
      try {
        const safeSport = safeString(sport);
        await setDoc(doc(db, "slotPrices", safeSport), { price });
        return { success: true };
      } catch (err: any) {
        console.error('Error creating slot price document:', err);
        return { success: false, error: safeString(err?.message) || 'Failed to create price document' };
      }
    }
    console.error('Error updating slot price:', error);
    return { success: false, error: safeString(error?.message) || 'Failed to update price' };
  }
};

export const attemptBookingWithSlotCheck = async (bookingData: any) => {
  try {
    const bookingRef = collection(db, "bookings");
    let result;
    
    await runTransaction(db, async (transaction) => {
      // For each slot, check if it is already booked
      const timeSlots = bookingData.timeSlots || [];
      for (const slot of timeSlots) {
        const safeSlot = safeString(slot);
        const slotQuery = query(
          bookingRef,
          where("date", "==", safeString(bookingData.date)),
          where("sportType", "==", safeString(bookingData.sportType)),
          where("timeSlot", "==", safeSlot),
          where("paymentStatus", "==", "success")
        );
        const slotSnapshot = await getDocs(slotQuery);
        if (!slotSnapshot.empty) {
          result = { success: false, reason: "Slot already booked" };
          return;
        }
      }
      
      // Also check for blocked slots
      const blockedSlotsQuery = query(
        collection(db, "blockedSlots"),
        where("date", "==", safeString(bookingData.date)),
        where("sportType", "==", safeString(bookingData.sportType))
      );
      const blockedSlotsSnapshot = await getDocs(blockedSlotsQuery);
      const blockedSlots = blockedSlotsSnapshot.docs.map(doc => safeString(doc.data().timeSlot));
      
      for (const slot of timeSlots) {
        if (blockedSlots.includes(safeString(slot))) {
          result = { success: false, reason: "Slot is blocked" };
          return;
        }
      }
      
      // Check for blocked dates
      const blockedDatesQuery = query(
        collection(db, "blockedDates"),
        where("date", "==", safeString(bookingData.date))
      );
      const blockedDatesSnapshot = await getDocs(blockedDatesQuery);
      if (!blockedDatesSnapshot.empty) {
        result = { success: false, reason: "Date is blocked" };
        return;
      }
      
      // All slots are available, create the booking
      const docRef = doc(bookingRef);
      transaction.set(docRef, {
        ...bookingData,
        createdAt: Timestamp.now(),
      });
      result = { success: true, id: docRef.id };
    });
    
    return result;
  } catch (error: any) {
    console.error('Error in atomic booking creation:', error);
    return { success: false, error: safeString(error?.message) || 'Booking creation failed' };
  }
};

export const logFailedPayment = async (logData: any) => {
  try {
    await addDoc(collection(db, "failedPayments"), {
      ...logData,
      createdAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: safeString(error?.message) || 'Failed to log failed payment' };
  }
};

// Tournament Management Functions
export const getTournaments = async () => {
  try {
    const tournamentsRef = collection(db, "tournaments");
    const q = query(tournamentsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const tournaments: any[] = [];
    querySnapshot.forEach((doc) => {
      tournaments.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      });
    });
    
    return tournaments;
  } catch (error: any) {
    console.error('Error fetching tournaments:', error);
    return [];
  }
};

export const getTournament = async (tournamentId: string) => {
  try {
    const safeTournamentId = safeString(tournamentId);
    const tournamentRef = doc(db, "tournaments", safeTournamentId);
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (tournamentDoc.exists()) {
      return {
        id: tournamentDoc.id,
        ...tournamentDoc.data(),
        createdAt: tournamentDoc.data().createdAt?.toDate(),
        updatedAt: tournamentDoc.data().updatedAt?.toDate(),
      };
    }
    
    return null;
  } catch (error: any) {
    console.error('Error fetching tournament:', error);
    return null;
  }
};

export const createTournament = async (tournamentData: any) => {
  try {
    const tournamentsRef = collection(db, "tournaments");
    const docRef = await addDoc(tournamentsRef, {
      ...tournamentData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error creating tournament:', error);
    return { success: false, error: safeString(error?.message) || 'Failed to create tournament' };
  }
};

export const updateTournament = async (tournamentId: string, updates: any) => {
  try {
    const safeTournamentId = safeString(tournamentId);
    const tournamentRef = doc(db, "tournaments", safeTournamentId);
    await updateDoc(tournamentRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating tournament:', error);
    return { success: false, error: safeString(error?.message) || 'Failed to update tournament' };
  }
};

export const updateTournamentSlots = async (tournamentId: string, remainingSlots: number) => {
  try {
    const safeTournamentId = safeString(tournamentId);
    const tournamentRef = doc(db, "tournaments", safeTournamentId);
    await updateDoc(tournamentRef, {
      remainingSlots,
      updatedAt: Timestamp.now(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating tournament slots:', error);
    return { success: false, error: safeString(error?.message) || 'Failed to update tournament slots' };
  }
};

export const deleteTournament = async (tournamentId: string) => {
  try {
    const safeTournamentId = safeString(tournamentId);
    const tournamentRef = doc(db, "tournaments", safeTournamentId);
    await deleteDoc(tournamentRef);
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting tournament:', error);
    return { success: false, error: safeString(error?.message) || 'Failed to delete tournament' };
  }
};

// Tournament Booking Functions
export const createTournamentBooking = async (bookingData: any) => {
  try {
    const bookingsRef = collection(db, "tournamentBookings");
    const docRef = await addDoc(bookingsRef, {
      ...bookingData,
      bookingDate: Timestamp.now(),
    });
    
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error('Error creating tournament booking:', error);
    return { success: false, error: safeString(error?.message) || 'Failed to create tournament booking' };
  }
};

export const getTournamentBookings = async (filters?: { tournamentId?: string; status?: string }) => {
  try {
    const bookingsRef = collection(db, "tournamentBookings");
    let q = query(bookingsRef, orderBy("bookingDate", "desc"));
    
    if (filters?.tournamentId) {
      q = query(q, where("tournamentId", "==", safeString(filters.tournamentId)));
    }
    
    if (filters?.status) {
      q = query(q, where("status", "==", safeString(filters.status)));
    }
    
    const querySnapshot = await getDocs(q);
    
    const bookings: any[] = [];
    querySnapshot.forEach((doc) => {
      bookings.push({
        id: doc.id,
        ...doc.data(),
        bookingDate: doc.data().bookingDate?.toDate(),
      });
    });
    
    return bookings;
  } catch (error: any) {
    console.error('Error fetching tournament bookings:', error);
    return [];
  }
};

export const updateTournamentBooking = async (bookingId: string, updates: any) => {
  try {
    const safeBookingId = safeString(bookingId);
    const bookingRef = doc(db, "tournamentBookings", safeBookingId);
    await updateDoc(bookingRef, updates);
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating tournament booking:', error);
    return { success: false, error: safeString(error?.message) || 'Failed to update tournament booking' };
  }
};
