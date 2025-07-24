# Firebase Setup Guide for Turf Booking System

## Current Status
✅ Firebase project created: `turf-a8d1b`
✅ Firebase SDK configured and connected
❌ Firestore Database not enabled (causing connection errors)
❌ Authentication not enabled

## Step 1: Enable Firestore Database

1. Go to your [Firebase Console](https://console.firebase.google.com/project/turf-a8d1b)
2. Click **"Firestore Database"** in the left sidebar
3. Click **"Create database"**
4. **Select "Start in test mode"** (we'll set proper rules later)
5. **Choose your region** (select closest to your users)
6. Click **"Done"**

## Step 2: Enable Authentication

1. In Firebase Console, click **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Click **"Email/Password"**
5. **Enable** the first option (Email/Password)
6. Click **"Save"**

## Step 3: Create Admin User

1. Go to **"Users"** tab in Authentication
2. Click **"Add user"**
3. Enter your admin email and password
4. Click **"Add user"**

## Step 4: Deploy Security Rules

After enabling Firestore, run this command to deploy the security rules:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

## What This Fixes

- ✅ Eliminates the Firestore connection errors
- ✅ Allows booking data to be saved
- ✅ Enables admin dashboard functionality
- ✅ Activates real-time slot availability

## Test After Setup

1. Visit your app at localhost:5000
2. Try making a test booking
3. Access admin panel at localhost:5000/admin-access-sptp2024
4. Log in with your admin credentials

## Next: Payment Integration

Once Firebase is working, we can set up:
- Razorpay for payments
- EmailJS for confirmations
- WhatsApp integration