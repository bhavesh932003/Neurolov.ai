'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/app/auth/useUser';
import { signInWithProvider, getSupabaseClient } from '@/app/auth/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(true);
  const loginAttemptRef = useRef(false);
  const loginTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }

    return () => {
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
      }
    };
  }, [user, loading, router]);

  const handleGoogleAuth = useCallback(async () => {
    if (loginAttemptRef.current || isLoading) {
      toast.error('Login already in progress');
      return;
    }

    try {
      loginAttemptRef.current = true;
      setIsLoading(true);
      const client = getSupabaseClient();
      const { error: authError } = await signInWithProvider('google');

      if (authError) {
        console.error('Google login error:', authError);
        toast.error(authError.message || 'Error signing in with Google');
        return;
      }

      loginTimeoutRef.current = setTimeout(async () => {
        const { data: { session }, error: sessionError } = await client.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          return;
        }

        if (subscribed && session?.user?.email) {
          await fetch('/api/newsletter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: session.user.email }),
          });
        }

        router.replace('/dashboard');
      }, 1000);
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Error during authentication');
    } finally {
      loginAttemptRef.current = false;
      setIsLoading(false);
    }
  }, [router, subscribed]);

  if (loading) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh]">
      {/* Hero Image Section */}
      <div className="w-full md:w-2/3 relative h-[40vh] md:h-[100dvh]">
        <Image
          src="/login/login.png"
          alt="Neurolov platform showcasing decentralized GPU compute and AI agents"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent" />
      </div>

      {/* Main Content Section */}
      <div className="w-full md:w-1/3 bg-[#0066FF] flex items-center justify-center p-4 md:p-8 relative z-10">
        <div className="w-full max-w-md space-y-6 md:space-y-8">
          {/* ✅ H1 Title */}
          <h1 className="text-2xl font-bold text-white text-center leading-tight">
            Decentralized GPU Compute & AI Agents on Solana Blockchain
          </h1>

          {/* ✅ H2 for Call to Action */}
          <h2 className="text-lg font-semibold text-white text-center">
            Rent GPUs, Generate AI Models, and Join the NLOV Token Presale
          </h2>

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            className="w-full bg-white text-[#0066FF] hover:bg-white/90"
            onClick={handleGoogleAuth}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </Button>

          {/* Newsletter Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="newsletter"
              checked={subscribed}
              onCheckedChange={(checked) => setSubscribed(checked as boolean)}
              className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#0066FF] mt-1"
            />
            <label htmlFor="newsletter" className="text-sm text-white leading-tight">
              Subscribe to our newsletter for updates and news.
            </label>
          </div>

          {/* ✅ Internal Links */}
          <Link href="/wallet" title="Connect your crypto wallet to Neurolov" className="text-white underline">Connect Wallet</Link>
<Link href="/gpublab" title="Explore decentralized GPU compute lab" className="text-white underline">Explore GPU Lab</Link>
<Link href="/presale" title="Join NLOV Token Presale and participate" className="text-white underline">Join NLOV Token Presale</Link>

        </div>
      </div>

      {/* Decorative Background */}
      <div className="absolute right-0 top-0 w-full md:w-1/3 h-full pointer-events-none">
        <div className="absolute inset-0 bg-[url('/circuit-pattern.svg')] opacity-10" />
      </div>
    </div>
  );
}
