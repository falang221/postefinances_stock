'use client';

import DAFDashboard from '@/components/DAFDashboard';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { UserFullResponse, UserRole } from '@/types/api';

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

// Helper function to check if a string is a valid UserRole
const isUserRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};

export default function DAFPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserFullResponse | null>(null);
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

      // Validate the role from the token
      if (!isUserRole(decoded.role)) {
        console.error("Invalid user role in token:", decoded.role);
        localStorage.removeItem('token');
        router.push('/');
        return;
      }
      
      const userObject: UserFullResponse = {
        id: decoded.userId,
        username: decoded.username,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role as UserRole, // Cast after validation
        department: decoded.department,
        createdAt: new Date().toISOString(), // Placeholder, as createdAt is not in the token
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

  // Pass the user and token as props to the dashboard
  return <DAFDashboard />;
}
