"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/auth/useUser';
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { getSupabaseClient } from "@/app/auth/supabase";
import styles from './styles.module.scss';

const BetaTag = () => (
  <Badge 
    variant="secondary" 
    className="absolute -top-3 -right-3 px-2.5 py-0.5 text-[10px] font-medium tracking-wider bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5 backdrop-blur-sm transform hover:scale-105 transition-all duration-300"
  >
    BETA
  </Badge>
);

const DashboardPage = () => {
  const router = useRouter();
  const { user, loading } = useUser();
  const [mounted, setMounted] = useState(false);
  const [plan, setPlan] = useState(""); 

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      const fetchPlan = async () => {
        const { data, error } = await getSupabaseClient()
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .single();
        if (error) {
          console.error("Error fetching plan:", error);
          setPlan("free");
        } else {
          setPlan(data?.plan || "free");
        }
      };

      fetchPlan();
    }
  }, [user]);

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  const isDevUser = user?.email === 'nitishmeswal@gmail.com';

  const handleGetNotified = (feature: string) => {
    toast.success(`You will be notified when ${feature} launches!`);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#40A6FF] to-[#2D63FF] text-transparent bg-clip-text mb-2">
          Welcome back, {user?.user_metadata?.full_name || 'User'}
        </h1>
        <p className="text-gray-500">Member since {new Date(user.created_at).toLocaleDateString()}</p>
        <div className="flex gap-8 mt-6">
          <div className="bg-gradient-to-br from-black/10 to-black/30 backdrop-blur-lg rounded-xl p-4 border border-white/5">
            <p className="text-gray-400 text-sm font-medium mb-1">Current Plan</p>
            <p className="text-white text-xl font-semibold">{plan || "free"}</p>
          </div>
          <div className="bg-gradient-to-br from-black/10 to-black/30 backdrop-blur-lg rounded-xl p-4 border border-white/5 group relative overflow-hidden">
            <p className="text-gray-400 text-sm font-medium mb-1">Available Credits</p>
            <p className="text-white text-xl font-semibold group-hover:opacity-30 transition-all duration-300">...</p>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="transform translate-y-[-100%] group-hover:translate-y-0 transition-transform duration-300 ease-out">
                <Button
                  className="bg-gradient-to-r from-[#40A6FF] to-[#2D63FF] hover:from-[#2D63FF] hover:to-[#40A6FF] text-white font-medium px-6 py-2.5 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-[#40A6FF]/20"
                  onClick={() => router.push('/billing')}
                >
                  Buy Credits
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="group relative transform hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#40A6FF] to-[#2D63FF] rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <Card className="relative bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-xl border-white/5 hover:border-white/10 transition-all duration-300">
            <BetaTag />
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-white">AI Models</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-6">
                Deploy and manage your AI models with ease. Access pre-trained models or upload your own.
              </p>
              <Button 
                className={`${styles.dashboardBtn} relative overflow-hidden group/btn w-full h-[42px]`}
                onClick={() => router.push('/ai-models')}
              >
                MANAGE MODELS
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* AI Agents */}
        <div className="group relative transform hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#40A6FF] to-[#2D63FF] rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <Card className="relative bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-xl border-white/5 hover:border-white/10 transition-all duration-300">
            <BetaTag />
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-white">AI Agents</CardTitle>
              <CardDescription className="text-gray-500">Coming in Version 2.0</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-6">
                Deploy powerful AI agents for your blockchain needs. Automate and optimize.
              </p>
              <Button 
                className={`${styles.dashboardBtn} relative overflow-hidden group/btn w-full h-[42px]`}
                onClick={() => !isDevUser ? handleGetNotified('AI Agents') : router.push('/ai-agents')}
              >
                <span className="relative z-10 group-hover/btn:opacity-0 transition-opacity duration-300">
                  {isDevUser ? 'VIEW AGENTS' : 'COMING SOON'}
                </span>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-600 to-cyan-600">
                  GET NOTIFIED
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="group relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#40A6FF] to-[#2D63FF] rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
          <Card className="relative bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-xl border-white/5 hover:border-white/10 transition-all duration-300">
            <BetaTag />
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-white">GPU Marketplace</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-6">
                Rent or provide GPU computing power. Access high-performance GPUs on demand.
              </p>
              <Button 
                className={`${styles.dashboardBtn} relative overflow-hidden group/btn w-full h-[42px]`}
                onClick={() => router.push('/gpu-marketplace')}
              >
                EXPLORE GPUS
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="group relative transform hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#40A6FF] to-[#2D63FF] rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <Card className="relative bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-xl border-white/5 hover:border-white/10 transition-all duration-300">
            <BetaTag />
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-white">Connect to Earn</CardTitle>
              <CardDescription className="text-gray-500">Coming in Version 3.0</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-6">
                Share your compute resources and earn credits. Monitor your earnings in real-time.
              </p>
              <Button 
                className={`${styles.dashboardBtn} relative overflow-hidden group/btn w-full h-[42px]`}
                onClick={() => !isDevUser ? handleGetNotified('Connect to Earn') : router.push('/connect-to-earn')}
              >
                <span className="relative z-10 group-hover/btn:opacity-0 transition-opacity duration-300">
                  {isDevUser ? 'START EARNING' : 'COMING SOON'}
                </span>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-600 to-cyan-600">
                  GET NOTIFIED
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="group relative transform hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#40A6FF] to-[#2D63FF] rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <Card className="relative bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-xl border-white/5 hover:border-white/10 transition-all duration-300">
            <BetaTag />
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-white">NodeNet</CardTitle>
              <CardDescription className="text-gray-500">Coming in Version 2.0</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-6">
                Decentralized compute network. Contribute and earn from the network.
              </p>
              <Button 
                className={`${styles.dashboardBtn} relative overflow-hidden group/btn w-full h-[42px]`}
                onClick={() => !isDevUser ? handleGetNotified('NodeNet') : router.push('/dashboard/NodeNet')}
              >
                <span className="relative z-10 group-hover/btn:opacity-0 transition-opacity duration-300">
                  {isDevUser ? 'EXPLORE NODENET' : 'COMING SOON'}
                </span>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-600 to-cyan-600">
                  GET NOTIFIED
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
