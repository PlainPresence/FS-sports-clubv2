const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.cleanOldBookings = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const db = admin.firestore();
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  // Clean regular bookings
  const bookingsSnap = await db.collection('bookings').get();
  let deletedBookings = 0;
  const bookingsBatch = db.batch();

  bookingsSnap.forEach(doc => {
    let bookingDate = doc.data().date;
    if (bookingDate && bookingDate.toDate) {
      bookingDate = bookingDate.toDate();
    } else if (typeof bookingDate === 'string') {
      bookingDate = new Date(bookingDate);
    }
    if (bookingDate && bookingDate < fiveDaysAgo) {
      bookingsBatch.delete(doc.ref);
      deletedBookings++;
    }
  });

  if (deletedBookings > 0) await bookingsBatch.commit();

  // Clean up slotAvailability for deleted bookings
  if (deletedBookings > 0) {
    const slotAvailSnap = await db.collection('slotAvailability').get();
    const slotAvailBatch = db.batch();
    slotAvailSnap.forEach(doc => {
      const slot = doc.data();
      // Check if there is still a valid booking for this slot
      const stillBooked = bookingsSnap.docs.some(bdoc => {
        const bdata = bdoc.data();
        if (bdata.status !== 'confirmed' || bdata.paymentStatus !== 'success') return false;
        if (bdata.date !== slot.date || bdata.sportType !== slot.sportType) return false;
        if (Array.isArray(bdata.timeSlots)) {
          return bdata.timeSlots.includes(slot.timeSlot);
        }
        return bdata.timeSlot === slot.timeSlot;
      });
      if (!stillBooked) {
        slotAvailBatch.delete(doc.ref);
      }
    });
    await slotAvailBatch.commit();
  }

  // Clean tournament bookings
  const tournamentSnap = await db.collection('tournamentBookings').get();
  let deletedTournamentBookings = 0;
  const tournamentBatch = db.batch();

  tournamentSnap.forEach(doc => {
    let bookingDate = doc.data().bookingDate;
    if (bookingDate && bookingDate.toDate) {
      bookingDate = bookingDate.toDate();
    } else if (typeof bookingDate === 'string') {
      bookingDate = new Date(bookingDate);
    }
    if (bookingDate && bookingDate < fiveDaysAgo) {
      tournamentBatch.delete(doc.ref);
      deletedTournamentBookings++;
    }
  });

  if (deletedTournamentBookings > 0) await tournamentBatch.commit();

  console.log(`Deleted ${deletedBookings} regular bookings and ${deletedTournamentBookings} tournament bookings older than 5 days.`);
  return null;
});
