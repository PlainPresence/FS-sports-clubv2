// Admin User Creation Script
// Run this after enabling Firebase Authentication
//
// Usage:
// 1. Create a .env file with your Firebase config and admin panel URL (see .env.example)
// 2. Run: node create-admin.js

import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Create admin user
async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@turf.com';  // Set in .env
    const password = process.env.ADMIN_PASSWORD || 'TurfAdmin2024!'; // Set in .env
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('✅ Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', userCredential.user.uid);
    console.log('\nYou can now access the admin panel at:');
    const adminUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:5000/admin-access-sptp2024';
    console.log(adminUrl);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('Admin user already exists with this email.');
    }
  }
}

createAdmin();
