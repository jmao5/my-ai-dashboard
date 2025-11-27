"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { OverlayProvider } from "@toss/use-overlay";
import { Toaster } from "sonner";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <OverlayProvider>
          {children}
          <Toaster position="top-center" theme="dark" richColors closeButton />
        </OverlayProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
