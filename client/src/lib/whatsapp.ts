export const generateWhatsAppMessage = (bookingData: any) => {
  const message = `🏟️ BOOKING CONFIRMED!

Hi ${bookingData.fullName || 'Customer'}! Your turf booking is confirmed.

📋 Booking Details:
🆔 Booking ID: ${bookingData.bookingId || 'N/A'}
🏆 Sport: ${(bookingData.sportType || 'Unknown').charAt(0).toUpperCase() + (bookingData.sportType || 'Unknown').slice(1)}
📅 Date: ${new Date(bookingData.date || new Date()).toLocaleDateString('en-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}
⏰ Time: ${Array.isArray(bookingData.timeSlots) ? bookingData.timeSlots.join(', ') : (bookingData.timeSlot || 'N/A')}
${bookingData.teamName ? `
🏏 Team: ${bookingData.teamName}` : ''}
💰 Amount Paid: ₹${bookingData.amount || 0}

Thank you for booking with SportsTurf Pro!
`;
  return message;
};

export const sendWhatsAppNotification = (bookingData: any) => {
  const customerNumber = bookingData.mobile || '';
  if (!customerNumber) {
    console.error('No mobile number provided for WhatsApp notification');
    return false;
  }
  
  const message = generateWhatsAppMessage(bookingData);
  const encodedMessage = encodeURIComponent(message);
  const whatsappURL = `https://wa.me/${customerNumber}?text=${encodedMessage}`;
  try {
    window.open(whatsappURL, '_blank');
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
    return false;
  }
};

export const openWhatsApp = (bookingData: any, phoneNumber?: string) => {
  const message = generateWhatsAppMessage(bookingData);
  const encodedMessage = encodeURIComponent(message);
  const targetPhone = phoneNumber || bookingData.mobile || '';
  
  if (!targetPhone) {
    console.error('No phone number provided for WhatsApp');
    return false;
  }
  
  const whatsappURL = `https://wa.me/${targetPhone}?text=${encodedMessage}`;
  try {
    window.open(whatsappURL, '_blank');
    return true;
  } catch (error) {
    console.error('Failed to open WhatsApp:', error);
    return false;
  }
};
