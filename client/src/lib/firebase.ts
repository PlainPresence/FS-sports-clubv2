import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, Timestamp, doc, updateDoc, setDoc, QueryDocumentSnapshot, runTransaction } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

console.log("FIREBASE CONFIG:", firebaseConfig);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const loginAdmin = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const logoutAdmin = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
};

export const getBookings = async (filters?: { date?: string; search?: string }) => {
  try {
    let q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    
    if (filters?.date) {
      q = query(collection(db, "bookings"), where("date", "==", filters.date), orderBy("createdAt", "desc"));
    }
    
    const querySnapshot = await getDocs(q);
    const bookings = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    if (filters?.search) {
      return bookings.filter((booking: any) => 
        booking.mobile?.includes(filters.search!) || 
        booking.bookingId?.includes(filters.search!) ||
        booking.fullName?.toLowerCase().includes(filters.search!.toLowerCase())
      );
    }

    return bookings;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const updateBooking = async (bookingId: string, updates: Partial<{ amount: number; paymentStatus: string }>) => {
  try {
    const bookingRef = doc(db, "bookings", bookingId);
    await updateDoc(bookingRef, updates);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getAvailableSlots = async (date: string, sportType: string) => {
  try {
    // Get existing bookings
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("date", "==", date),
      where("sportType", "==", sportType),
      where("paymentStatus", "==", "success")
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const bookedSlots = bookingsSnapshot.docs.map((doc: any) => doc.data().timeSlot);

    // Get blocked slots
    const blockedSlotsQuery = query(
      collection(db, "blockedSlots"),
      where("date", "==", date),
      where("sportType", "==", sportType)
    );
    const blockedSlotsSnapshot = await getDocs(blockedSlotsQuery);
    const blockedSlots = blockedSlotsSnapshot.docs.map((doc: any) => doc.data().timeSlot);

    // Get blocked dates
    const blockedDatesQuery = query(
      collection(db, "blockedDates"),
      where("date", "==", date)
    );
    const blockedDatesSnapshot = await getDocs(blockedDatesQuery);
    const isDateBlocked = !blockedDatesSnapshot.empty;

    return {
      bookedSlots,
      blockedSlots,
      isDateBlocked,
    };
  } catch (error: any) {
    throw new Error(error.message);
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
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
};

// Slot Prices Management
// Now supports arbitrary keys, including 'speedMeter' for add-ons
// Example: updateSlotPrice('speedMeter', 100)
export const getSlotPrices = async () => {
  try {
    const pricesSnapshot = await getDocs(collection(db, "slotPrices"));
    const prices: Record<string, number> = {};
    pricesSnapshot.forEach((docSnap: QueryDocumentSnapshot<{ price: number }>) => {
      prices[docSnap.id] = docSnap.data().price;
    });
    return prices;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const updateSlotPrice = async (sport: string, price: number) => {
  try {
    const priceRef = doc(db, "slotPrices", sport);
    await updateDoc(priceRef, { price });
    return { success: true };
  } catch (error: any) {
    // If doc doesn't exist, create it
    if (error.code === 'not-found' || error.message?.includes('No document to update')) {
      try {
        await setDoc(doc(db, "slotPrices", sport), { price });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
    return { success: false, error: error.message };
  }
};

export const attemptBookingWithSlotCheck = async (bookingData: any) => {
  try {
    const bookingRef = collection(db, "bookings");
    // Check all slots in bookingData.timeSlots
    let result;
    await runTransaction(db, async (transaction) => {
      // For each slot, check if it is already booked
      for (const slot of bookingData.timeSlots) {
        const slotQuery = query(
          bookingRef,
          where("date", "==", bookingData.date),
          where("sportType", "==", bookingData.sportType),
          where("timeSlot", "==", slot),
          where("paymentStatus", "==", "success")
        );
        const slotSnapshot = await getDocs(slotQuery);
        if (!slotSnapshot.empty) {
          // At least one slot is already booked
          result = { success: false, reason: "Slot already booked" };
          return;
        }
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
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
};
