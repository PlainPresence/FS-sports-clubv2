# Demo Booking - Test Your System

## Sample Booking Details

Use these details to test your booking system:

**Customer Info:**
- Name: `John Smith`
- Mobile: `9876543210`
- Email: `john@example.com` (optional)
- Team Name: `Warriors FC` (optional)

**Booking Details:**
- Sport: `Football` (₹1000)
- Date: Today's date or tomorrow
- Time: Any available slot (6:00 AM - 10:00 PM)

## Expected Flow

1. **Form Validation**: All fields validate correctly
2. **Slot Checking**: Shows only available time slots
3. **Booking ID Generation**: Creates unique ID like `SPT1G2H3K4L5M`
4. **Payment**: Razorpay payment gateway opens
5. **Confirmation**: Success page with WhatsApp sharing option

## Current Limitations (Due to Firebase Setup)

- **Data Storage**: Bookings won't save permanently until Firestore is enabled
- **Admin Dashboard**: Needs Firebase Authentication enabled
- **Real-time Updates**: Requires Firestore Database connection

## Quick Firebase Fix

To make bookings save permanently:

1. Go to Firebase Console: https://console.firebase.google.com/project/turf-a8d1b
2. Enable Firestore Database (Start in test mode)
3. Enable Authentication with Email/Password
4. Create admin user for dashboard access

## Test the Booking Now

Visit `http://localhost:5000` and try making a booking with the sample details above. The booking flow will work - it's just waiting for database connectivity to store the data.