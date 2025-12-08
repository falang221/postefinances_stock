'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { UserFullResponse, UserRole } from '@/types/api'; // Import UserFullResponse and UserRole

interface DecodedToken {
  userId: string;
  username: string;
  email: string;
  name: string;
  role: string; // Should be string from token, will be validated
  department?: string;
  exp: number;
}

// Helper function to check if a string is a valid UserRole
const isUserRole = (role: string): role is UserRole => {
  return Object.values(UserRole).includes(role as UserRole);
};

interface AuthContextType {
  user: UserFullResponse | null; // Use UserFullResponse
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserFullResponse | null>(null); // Use UserFullResponse
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const decoded = jwtDecode<DecodedToken>(storedToken);
        if (decoded.exp * 1000 > Date.now()) {
          // Validate and cast role
          if (!isUserRole(decoded.role)) {
            console.error("Invalid user role in token:", decoded.role);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            setLoading(false);
            return;
          }

          setToken(storedToken);
          setUser({
            id: decoded.userId,
            username: decoded.username,
            name: decoded.name,
            email: decoded.email,
            role: decoded.role as UserRole, // Cast after validation
            department: decoded.department,
            createdAt: new Date().toISOString(), // Placeholder
          });
        } else {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to decode or validate token:", error);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } else {
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    try {
      const decoded = jwtDecode<DecodedToken>(newToken);
      // Validate and cast role
      if (!isUserRole(decoded.role)) {
        console.error("Invalid user role in new token:", decoded.role);
        setUser(null);
        return;
      }
      setUser({
        id: decoded.userId,
        username: decoded.username,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role as UserRole, // Cast after validation
        department: decoded.department,
        createdAt: new Date().toISOString(), // Placeholder
      });
    } catch (error) {
      console.error("Failed to decode new token:", error);
      setUser(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
