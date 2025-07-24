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
⏰ Time: ${bookingData.timeSlot}
${bookingData.teamName ? `🏏 Team: ${bookingData.teamName}` : ''}
💰 Amount Paid: ₹${bookingData.amount}
💳 Payment: SUCCESS ✅

Please arrive 10 minutes before your slot time.

Thank you for choosing SportsTurf Pro! 🙏

For any queries, contact us.`;

  return message;
};

// Send booking confirmation to customer's WhatsApp number
export const sendWhatsAppNotification = (bookingData: any) => {
  const customerNumber = bookingData.mobile;
  const message = generateWhatsAppMessage(bookingData);
  const encodedMessage = encodeURIComponent(message);
  
  // Automatically open WhatsApp to send to customer's number
  const whatsappURL = `https://wa.me/${customerNumber}?text=${encodedMessage}`;
  
  try {
    // Open WhatsApp in new tab/window
    const whatsappWindow = window.open(whatsappURL, '_blank');
    
    // Show success notification
    setTimeout(() => {
      if (whatsappWindow) {
        console.log('WhatsApp confirmation sent to customer');
      }
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp notification:', error);
    return false;
  }
};

// Customer sharing function (optional for customer use)
export const openWhatsApp = (bookingData: any, phoneNumber?: string) => {
  const message = generateWhatsAppMessage(bookingData);
  const encodedMessage = encodeURIComponent(message);
  const targetPhone = phoneNumber || bookingData.mobile;
  
  const whatsappURL = `https://wa.me/${targetPhone}?text=${encodedMessage}`;
  
  try {
    const userAgent = navigator.userAgent || navigator.vendor;
    
    if (/android/i.test(userAgent)) {
      const androidIntent = `intent://send?phone=${targetPhone}&text=${encodedMessage}#Intent;scheme=smsto;package=com.whatsapp;action=android.intent.action.SENDTO;end`;
      window.open(androidIntent, '_blank');
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
      window.open(`whatsapp://send?phone=${targetPhone}&text=${encodedMessage}`, '_blank');
    } else {
      window.open(whatsappURL, '_blank');
    }
    
    // Provide clipboard fallback after delay
    setTimeout(() => {
      if (confirm(
        'If WhatsApp didn\'t open automatically, would you like to copy the booking details to share manually?'
      )) {
        navigator.clipboard.writeText(message).then(() => {
          alert('Booking details copied to clipboard! You can now paste and share them.');
        }).catch(() => {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = message;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert('Booking details copied to clipboard! You can now paste and share them.');
        });
      }
    }, 3000);
    
  } catch (error) {
    if (confirm(
      'Unable to open WhatsApp automatically. Would you like to copy the booking details to share manually?'
    )) {
      navigator.clipboard.writeText(message).then(() => {
        alert('Booking details copied! You can now share them via any messaging app.');
      }).catch(() => {
        alert('Please manually share these details:\n\n' + message);
      });
    }
  }
};
