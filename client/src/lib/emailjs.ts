import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'demo_service';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'demo_template';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'demo_key';

export const sendBookingConfirmation = async (bookingData: any) => {
  try {
    const templateParams = {
      to_email: bookingData.email || '',
      to_name: bookingData.fullName || 'Customer',
      booking_id: bookingData.bookingId || 'N/A',
      sport_type: bookingData.sportType || 'Unknown',
      booking_date: bookingData.date || new Date().toISOString().split('T')[0],
      time_slot: Array.isArray(bookingData.timeSlots) ? bookingData.timeSlots.join(', ') : (bookingData.timeSlot || 'N/A'),
      amount: bookingData.amount || 0,
      mobile: bookingData.mobile || 'N/A',
      team_name: bookingData.teamName || 'Individual',
    };

    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    return { success: true, result };
  } catch (error: any) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

export const sendContactMessage = async (contactData: { name: string; email: string; subject: string; message: string }) => {
  try {
    const templateParams = {
      from_name: contactData.name || 'Anonymous',
      from_email: contactData.email || 'no-email@example.com',
      subject: contactData.subject || 'Contact Form Submission',
      message: contactData.message || 'No message provided',
    };
    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );
    return { success: true, result };
  } catch (error: any) {
    console.error('Contact email sending failed:', error);
    return { success: false, error: error.message };
  }
};
