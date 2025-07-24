import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'demo_service';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'demo_template';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'demo_key';

export const sendBookingConfirmation = async (bookingData: any) => {
  try {
    const templateParams = {
      to_email: bookingData.email,
      to_name: bookingData.fullName,
      booking_id: bookingData.bookingId,
      sport_type: bookingData.sportType,
      booking_date: bookingData.date,
      time_slot: bookingData.timeSlot,
      amount: bookingData.amount,
      mobile: bookingData.mobile,
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
      from_name: contactData.name,
      from_email: contactData.email,
      subject: contactData.subject,
      message: contactData.message,
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
