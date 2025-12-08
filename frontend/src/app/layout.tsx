'use client';

import type { Metadata } from "next";
import "./globals.css";
import { WebSocketProvider } from "@/components/WebSocketProvider";
import ThemeRegistry from "@/components/ThemeRegistry";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import Providers from "@/components/Providers"; // Import the new Providers component
import { NotificationProvider } from "@/context/NotificationContext";
import { usePathname } from 'next/navigation'; // New import
import Footer from "@/components/Footer"; // Import the Footer component
import { Box } from "@mui/material";



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname(); // Get current path

  return (
    <html lang="fr">
      <body>
        <ThemeRegistry>
          <AuthProvider>
            <NotificationProvider>
              <Providers> {/* Wrap with the new Providers component */}
                <WebSocketProvider>
                  <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                    {pathname !== '/' && <Navbar />} {/* Conditional rendering */}
                    <Box component="main" sx={{ flexGrow: 1 }}>
                      {children}
                    </Box>
                    {pathname !== '/' && <Footer />} {/* Conditional rendering */}
                  </Box>
                </WebSocketProvider>
              </Providers>
            </NotificationProvider>
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
