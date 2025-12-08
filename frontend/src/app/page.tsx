'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Login from '../components/Login';
import { useAuth } from '../context/AuthContext'; // Import useAuth

function Home() {
  const router = useRouter();
  const { user } = useAuth(); // Use the useAuth hook

  useEffect(() => {
    // If user is authenticated (user object is not null), redirect to dashboard
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]); // Depend on user and router

  // If not authenticated (user is null), render the Login component
  if (!user) {
    return <Login />;
  }

  return null; // Don't render anything while redirecting or if authenticated and waiting for redirect
}

export default Home;