'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // It's a good practice to set a staleTime to avoid refetching too often
      staleTime: 1000 * 60 * 5, // 5 minutes
      // You can also set a gcTime (garbage collection time)
      // gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
}

const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default Providers;
