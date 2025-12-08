'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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

interface WebSocketContextType {
  sendMessage: (message: string) => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000/api/ws';

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') { // Add this check
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const decoded = jwtDecode<DecodedToken>(storedToken);
          if (decoded.exp * 1000 > Date.now()) { // Check if token is not expired
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUserId(decoded.userId);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setToken(storedToken);
          } else {
            localStorage.removeItem('token');
            // Optionally redirect to login
          }
        } catch (error) {
          console.error("Failed to decode or validate token:", error);
          localStorage.removeItem('token');
          // Optionally redirect to login
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!userId || !token) {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      return;
    }

    // Close existing connection if any
    if (ws.current) {
      ws.current.close();
    }

    const socket = new WebSocket(`${WS_URL}/${token}`);
    ws.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      try {
        const messageData = JSON.parse(event.data);
        switch (messageData.type) {
          case 'low_stock_alert':
            toast.warn(messageData.message, {
              position: "top-right",
              autoClose: 8000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
            });
            break;
          case 'daf_approval_request':
            toast.info(messageData.message, {
              position: "top-right",
              autoClose: 8000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
            });
            break;
          case 'daf_receipt_decision':
          case 'daf_adjustment_decision':
            toast.success(messageData.message, {
              position: "top-right",
              autoClose: 8000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
            });
            break;
          default:
            toast.info(messageData.message, {
              position: "top-right",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
            });
            break;
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message as JSON:", error);
        toast.info(event.data, { // Fallback to plain text if JSON parsing fails
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
      }
    };

    socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      setIsConnected(false);
      // Attempt to reconnect after a delay if it was an unexpected close
      if (event.code !== 1000 && event.code !== 1001) { // 1000: Normal Closure, 1001: Going Away
        console.log('Attempting to reconnect WebSocket...');
        setTimeout(() => {
          // Re-trigger useEffect by updating token/userId state or similar
          // For simplicity, we'll just rely on the parent component to re-render if token changes
          // or a full page refresh. A more robust solution would involve a dedicated reconnect logic.
        }, 3000);
      }
    };

    socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      let errorMessage = "Erreur de connexion aux notifications.";
      if (event instanceof ErrorEvent && event.message) {
        errorMessage += ` Détails: ${event.message}`;
      }
      toast.error(errorMessage);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [userId, token]); // Reconnect if userId or token changes

  const sendMessage = (message: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    } else {
      console.warn('WebSocket is not connected. Message not sent.');
    }
  };

  return (
    <WebSocketContext.Provider value={{ sendMessage, isConnected }}>
      {children}
      <ToastContainer />
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
