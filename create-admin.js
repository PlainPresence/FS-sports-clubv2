// Admin User Creation Script
// Run this after enabling Firebase Authentication

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB2WaYnFrmiR8_wBQ1Fil7cOwvEqgp1o-M",
  authDomain: "turf-a8d1b.firebaseapp.com",
  projectId: "turf-a8d1b",
  storageBucket: "turf-a8d1b.firebasestorage.app",
  messagingSenderId: "852354056557",
  appId: "1:852354056557:web:3e20a02dd1a9b0d007da64"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Create admin user
async function createAdmin() {
  try {
    const email = 'admin@turf.com';  // Change this to your preferred admin email
    const password = 'TurfAdmin2024!'; // Change this to your preferred password
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('✅ Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', userCredential.user.uid);
    console.log('\nYou can now access the admin panel at:');
    console.log('http://localhost:5000/admin-access-sptp2024');
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('Admin user already exists with this email.');
    }
  }
}

createAdmin();