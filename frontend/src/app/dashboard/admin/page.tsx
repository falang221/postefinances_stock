'use client';

import AdminDashboard from '@/components/AdminDashboard';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

// Define the structure of the decoded token payload
interface DecodedToken {
  userId: string;
  username: string;
  email: string;
  name: string;
  role: string;
  department: string;
  exp: number;
}

// Define the User interface to match what AdminDashboard expects
interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  department?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/'); // Redirect to login if no token
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(storedToken);
      
      // Check if token is expired
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        router.push('/');
        return;
      }
      
      // Ensure the user has the correct role
      if (decoded.role !== 'ADMIN') {
        console.error("Access denied: User is not an ADMIN");
        router.push('/dashboard'); 
        return;
      }

      const userObject: User = {
        id: decoded.userId,
        username: decoded.username,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
        department: decoded.department,
      };

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(userObject);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(storedToken);
    } catch (error) {
      console.error("Invalid token:", error);
      localStorage.removeItem('token');
      router.push('/');
    }
  }, [router]);

  // The AdminDashboard component is now self-sufficient and fetches its own data.
  return <AdminDashboard />;
}