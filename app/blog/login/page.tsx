'use client';

import React, { useState } from 'react';
// Removed useRouter and supabaseBrowserClient imports
import { loginWithPassword } from '../actions'; // Corrected import path
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function BlogLoginPage() {
  const [loading, setLoading] = useState(false);
  // Removed email and password state, will use FormData

  // Updated handleLogin to call the Server Action
  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    toast.dismiss();

    const formData = new FormData(event.currentTarget); // Get form data
    const result = await loginWithPassword(formData); // Call Server Action

    setLoading(false);

    if (result?.error) {
      toast.error(result.error);
    }
    // No explicit success handling needed here, as the Server Action handles the redirect
    // If the action redirects, this component might unmount before this point.
    // If it returns without redirecting (due to error), the error toast is shown.
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <ToastContainer theme="colored" position="top-right" />
      <h1>Blog Admin Login</h1>
      <p style={{ margin: '1rem 0' }}>Enter admin credentials.</p>
      {/* Use standard form submission which triggers the Server Action */}
      <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '300px' }}>
         <input
            type="email"
            name="email" // Add name attribute for FormData
            placeholder="Admin Email"
            // Removed value and onChange for uncontrolled component with FormData
            required
            style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            disabled={loading}
         />
         <input
            type="password"
            name="password" // Add name attribute for FormData
            placeholder="Password"
            // Removed value and onChange
            required
            style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            disabled={loading}
         />
         <button
            type="submit"
            style={{ padding: '10px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
         </button>
      </form>
    </div>
  );
}
