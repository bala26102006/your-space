import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AuthScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your email for the login link!');
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-bg-primary text-text-primary">
      <div className="w-full max-w-md p-8 bg-sidebar-bg rounded-xl shadow-lg border border-border-light">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign In to Your Space</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="p-3 rounded-lg bg-bg-primary border border-border-light focus:outline-none focus:border-brand-blue"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="p-3 rounded-lg bg-brand-blue text-white font-medium hover:bg-opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Sending link...' : 'Send Magic Link'}
          </button>
        </form>
        {message && (
          <p className="mt-4 text-sm text-center text-text-secondary">{message}</p>
        )}
      </div>
    </div>
  );
}
