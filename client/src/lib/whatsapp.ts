export const generateWhatsAppMessage = (bookingData: any) => {
  const message = `🏟️ BOOKING CONFIRMED!

Hi ${bookingData.fullName}! Your turf booking is confirmed.

📋 Booking Details:
🆔 Booking ID: ${bookingData.bookingId}
🏆 Sport: ${bookingData.sportType.charAt(0).toUpperCase() + bookingData.sportType.slice(1)}
📅 Date: ${new Date(bookingData.date).toLocaleDateString('en-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}
⏰ Time: ${Array.isArray(bookingData.timeSlots) ? bookingData.timeSlots.join(', ') : bookingData.timeSlot}
${bookingData.teamName ? `
🏏 Team: ${bookingData.teamName}` : ''}
💰 Amount Paid: ₹${bookingData.amount}

Thank you for booking with SportsTurf Pro!
`;
  return message;
};
