# Admin User Setup Steps

## Quick Steps (Do These First)

### 1. Enable Firebase Services
Go to Firebase Console: https://console.firebase.google.com/project/turf-a8d1b

**Enable Firestore Database:**
- Click "Firestore Database" → "Create database" 
- Choose "Start in test mode" → Select region → Done

**Enable Authentication:**
- Click "Authentication" → "Get started"
- Go to "Sign-in method" → Enable "Email/Password"

### 2. Create Admin User
**In Firebase Console:**
- Go to Authentication → "Users" tab
- Click "Add user"
- Email: `admin@turf.com` (or your choice)
- Password: `YourStrongPassword123!`
- Click "Add user"

### 3. Test Admin Access
- Go to: `http://localhost:5000/admin-access-sptp2024`
- Login with your admin credentials
- Access the full admin dashboard

## What You'll Get After Setup

✅ **No more Firebase connection errors**
✅ **Working booking system** - customers can make real bookings
✅ **Admin dashboard access** - manage all bookings and slots
✅ **Real-time data** - see bookings update live
✅ **Secure authentication** - protected admin routes

## Admin Dashboard Features

Once logged in at `/admin-access-sptp2024`, you can:
- View all bookings with search/filter
- See revenue statistics 
- Block specific time slots
- Block entire dates
- Export booking data
- Real-time booking notifications

## Default Admin Credentials (Change These)
- **URL**: `http://localhost:5000/admin-access-sptp2024`
- **Email**: `admin@turf.com`
- **Password**: `YourStrongPassword123!`

**Important**: Change the default credentials after first login!