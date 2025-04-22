// app/supabase-provider.tsx
"use client";

import React, { createContext, useContext, useState } from "react"; // Removed unused useEffect
// Import the specific type and the new client creation function
import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "../lib/supabase/client"; // Adjust path if needed

interface SupabaseContextType {
  supabase: SupabaseClient;
  // Keep the setter signature simple for now, might not be needed if client doesn't change
  // setSupabaseClient: (client: SupabaseClient) => void;
}

// Initialize context with null or a default shape if preferred
const SupabaseContext = createContext<SupabaseContextType | null>(null);

export const SupabaseProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize state with the browser client instance
  const [supabase] = useState<SupabaseClient>(() => createSupabaseBrowserClient());
  // Removed setSupabase state setter as it's unlikely needed for a stable client

  // Optional: Add effect for session changes if needed for reactivity
  // const router = useRouter(); // If you need router for redirects on auth change
  // useEffect(() => {
  //   const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
  //     // Handle auth state changes, e.g., refresh server-side props or redirect
  //     // router.refresh(); // Example: Refresh Server Components
  //   });
  //   return () => {
  //     subscription.unsubscribe();
  //   };
  // }, [supabase, router]); // Add router if used

  return (
    // Provide only the supabase client instance
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabaseClient = () => {
  const context = useContext(SupabaseContext);
  if (context === null) { // Check against null initialization
    throw new Error("useSupabaseClient must be used within a SupabaseProvider");
  }
  return context.supabase;
};

// Remove useSetSupabaseClient hook as the setter is removed from context
// export const useSetSupabaseClient = () => {
//   const context = useContext(SupabaseContext);
//   if (!context) {
//     throw new Error("useSetSupabaseClient must be used within a SupabaseProvider");
//   }
//   return context.setSupabaseClient;
// };
