'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/app/auth/useUser';
import { signInWithProvider, getSupabaseClient } from '@/app/auth/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { feature_flags } from '@/utils/featureFlags';


export default function RootPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [inputReferralCode, setInputReferralCode] = useState('');
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [isLoadingReferral, setIsLoadingReferral] = useState(false);
  const loginAttemptRef = useRef(false);
  const loginTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const urlReferralCode = searchParams.get('referral');
    if (urlReferralCode) {
      setReferralCode(urlReferralCode);
      localStorage.setItem('referralCode', urlReferralCode);
    } else {
      const storedReferralCode = localStorage.getItem('referralCode');
      if (storedReferralCode) {
        setReferralCode(storedReferralCode);
      }
    }
  }, [searchParams]);

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

  const applyReferralCode = async () => {
    if (!inputReferralCode.trim()) return;

    try {
      setIsLoadingReferral(true);
      const client = getSupabaseClient();

      const { data, error } = await client.rpc('is_referral_code_exists', {
        check_referral_code: inputReferralCode.trim()
      });

      if (error) {
        console.error('Error checking referral code:', error);
        toast.error('Error validating referral code');
        return;
      }

      if (!data || data === false) {
        toast.error('Invalid referral code');
        return;
      }

      setReferralCode(inputReferralCode.trim());
      localStorage.setItem('referralCode', inputReferralCode.trim());
      toast.success("Referral code applied successfully!");
      setShowReferralInput(false);
    } catch (error) {
      console.error('Referral validation error:', error);
      toast.error('Error validating referral code');
    } finally {
      setIsLoadingReferral(false);
    }
  };

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

        try {
          const { data: { session }, error: sessionError } = await client.auth.getSession();

          if (sessionError) {
            console.error('Session error:', sessionError);
            return;
          }

          if (subscribed && session?.user?.email) {
            try {
              const response = await fetch('/api/newsletter', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: session.user.email }),
              });

              const data = await response.json();

              if (!response.ok) {
                console.error('Newsletter subscription failed:', data.error);
                toast.error(data.error || 'Failed to subscribe to newsletter');
              } else {
                toast.success(data.message || 'Successfully subscribed to newsletter!');
              }
            } catch (error) {
              console.error('Newsletter error:', error);
              toast.error('Failed to subscribe to newsletter');
            }
          }

          router.replace('/dashboard');
        } catch (error: any) {
          console.error('Session error:', error);
          toast.error(error.message || 'Error getting session');
        }
      }, 1000);

    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Error during authentication');
    } finally {
      loginAttemptRef.current = false;
      setIsLoading(false);
    }
  }, [router, subscribed, referralCode]);

  const toggleReferralInput = () => {
    setShowReferralInput(!showReferralInput);
  };

  if (loading) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh]">
      {/* Hero Image Section */}
      <div className="w-full md:w-1/2 relative h-[50vh] md:h-[100dvh]">
        <Image
          src="/login/login-bg-2.jpg"
          alt="Neurolov platform showcasing decentralized GPU compute and AI agents"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent" />
      </div>

      {/* Main Content Section */}
      <div className="w-full md:w-1/2 bg-[#0066FF] flex items-center h-[50vh] md:h-[100dvh] justify-center p-4 md:p-8 relative z-10">
        <div className="w-full max-w-lg space-y-4 md:space-y-6 px-4">

          {/* <h1 className="text-2xl md:text-3xl font-bold text-white text-center leading-tight">
          Decentralized GPU Compute & AI Agents on Solana Blockchain
        </h1>
  
      
        <h2 className="text-lg md:text-xl font-semibold text-white text-center">
          Rent GPUs, Generate AI Models, and Join the NLOV Token Presale
        </h2> */}
          <h1 className='text-2xl md:text-3xl font-bold text-white text-center leading-tight'>
            Sign in to Neurolov
          </h1>

          <div className="space-y-4">
            {/* Referral code section */}
            {feature_flags.refferalOnSignIn &&  !referralCode &&
              (<div className="text-center">
                <button
                  onClick={toggleReferralInput}
                  className="text-sm text-white underline hover:text-white/80"
                >
                  {showReferralInput ? "Hide referral input" : "Have a referral code?"}
                </button>
              </div>)
            }

            {/* Referral input field */}
            { feature_flags.refferalOnSignIn && showReferralInput && !referralCode && (
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Enter referral code"
                  value={inputReferralCode}
                  onChange={(e) => setInputReferralCode(e.target.value)}
                  className="bg-white text-[#0066FF]"
                />
                <Button
                  onClick={applyReferralCode}
                  className="bg-white text-[#0066FF] hover:bg-white/90"
                  size="sm"
                  disabled={isLoadingReferral}
                >
                  {isLoadingReferral ? 'Checking...' : 'Apply'}
                </Button>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full bg-white text-[#0066FF] hover:bg-white/90 py-6"
              onClick={handleGoogleAuth}
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Continue with Google'}
            </Button>
          </div>

          <div className="flex items-start space-x-2 ml-1">
            <Checkbox
              id="newsletter"
              checked={subscribed}
            
              onCheckedChange={(checked) => setSubscribed(checked as boolean)}
              className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#0066FF] mt-1"
            />
            <label
              htmlFor="newsletter"
              className="text-sm text-white leading-tight mt-[3px]"
            >
              Subscribe to our newsletter for updates and news
            </label>
          </div>

          {/* Internal Links */}
          {/* <div className="flex flex-col md:flex-row justify-center space-y-2 md:space-y-0 md:space-x-4 pt-4">
            <Link href="/wallet" title="Connect your crypto wallet to Neurolov" className="text-white underline text-center">Connect Wallet</Link>
            <Link href="/gpublab" title="Explore decentralized GPU compute lab" className="text-white underline text-center">Explore GPU Lab</Link>
            <Link href="/presale" title="Join NLOV Token Presale and participate" className="text-white underline text-center">Join NLOV Token Presale</Link>
          </div> */}
        </div>
      </div>
      

      {/* Decorative Background - Adjusted to cover half the screen */}
      <div className="absolute right-0 top-0 w-full md:w-1/2 h-full pointer-events-none">
        <div className="absolute inset-0 bg-[url('/circuit-pattern.svg')] opacity-10 z-10" />
      </div>
    </div>
  );
}
