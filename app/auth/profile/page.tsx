'use client';

import { useUser } from '@/app/auth/useUser';
import { Button } from '@/components/ui/button';
import { Copy, Activity } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import SpotlightCard from '@/components/SpotLightCard';
import { getSupabaseClient } from '../supabase';
import { motion, useAnimation, useInView, AnimatePresence } from 'framer-motion';
import DynamicBackground from './components/DynamicBackground';
import { ArrowLeft } from 'lucide-react';


interface AnimatedGradientTextProps {
  children: React.ReactNode;
  className?: string;
}

interface AnimatedSpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  delay?: number;
}

interface AnimatedStatProps {
  value: string | number;
  label: string;
  loading: boolean;
  delay?: number;
  color?: string;
}

interface BadgeProps {
  text: string;
  color?: string;
}

interface ProfileData {
  id?: string;
  plan?: string;
  credits?: number;
  [key: string]: any;
}

const AnimatedGradientText: React.FC<AnimatedGradientTextProps> = ({ children, className = "" }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <h1
        className={`text-4xl font-bold text-transparent bg-clip-text ${className}`}
        style={{
          backgroundImage: 'linear-gradient(-45deg, #4F46E5, #06B6D4, #3B82F6, #8B5CF6)',
          backgroundSize: '300% 300%',
          animation: 'gradient-animation 4s ease infinite'
        }}
      >
        {children}
      </h1>

      <style jsx global>{`
        @keyframes gradient-animation {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
      `}</style>
    </motion.div>
  );
};

const AnimatedSpotlightCard: React.FC<AnimatedSpotlightCardProps> = ({
  children,
  className,
  spotlightColor,
  delay = 0
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 15 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
      transition={{ duration: 0.4, delay: delay * 0.5, ease: "easeOut" }}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        transition: { duration: 0.2, ease: "easeOut" }
      }}
    >
      <SpotlightCard
        className={className}
        spotlightColor={spotlightColor}
      >
        {children}
      </SpotlightCard>
    </motion.div>
  );
};

const AnimatedStat: React.FC<AnimatedStatProps> = ({
  value,
  label,
  loading,
  delay = 0,
  color = "text-white"
}) => {
  return (
    <div className="flex flex-col">
      <span className="text-lg font-medium text-gray-400 mb-2">{label}</span>
      {loading ? (
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-2xl font-bold text-white"
        >
          Loading...
        </motion.span>
      ) : (
        <motion.span
          initial={{ opacity: 0, scale: 0.9, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, delay: delay * 0.5 }}
          className={`text-2xl font-bold ${color}`}
        >
          {value}
        </motion.span>
      )}
    </div>
  );
};

const Badge: React.FC<BadgeProps> = ({
  text,
  color = "bg-gradient-to-r from-blue-500 to-indigo-600"
}) => {
  return (
    <div className={`px-3 py-1 rounded-full text-xs font-medium text-white ${color}`}>
      {text}
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const { user } = useUser();
  const [copied, setCopied] = useState<boolean>(false);
  const supabase = getSupabaseClient();
  const [profile, setProfile] = useState<ProfileData>({});
  const [loading, setLoading] = useState<boolean>(true);
  const controls = useAnimation();

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const fetchProfileData = async (): Promise<void> => {
      if (!user?.id) return;

      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile data:', error);
      } else {
        setProfile(data || {});
      }
      setLoading(false);
    };

    fetchProfileData();

    controls.start({
      opacity: 1,
      transition: { duration: 0.5 }
    });
  }, [user, supabase, controls]);

  if (!user) return null;

  const userInitial = user.user_metadata?.full_name?.[0] || user.email?.[0] || 'A';

  return (
    <div className="min-h-screen relative  bg-gradient-to-b from-gray-900 to-black">

      <DynamicBackground />


      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/40 to-black/10 z-1" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto p-8 relative z-10 pt-16"
      >
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            className="group flex items-center space-x-2 text-gray-300 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-sm border border-gray-800 hover:border-[#40A6FF] transition-all duration-300"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = '/dashboard';
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Go Back To Explore</span>
          </Button>
        </motion.div>
        <AnimatedGradientText className="mb-8 text-center">
          Your Profile Dashboard
        </AnimatedGradientText>

        <div className="space-y-6">
          {/* Basic Info */}
          <AnimatedSpotlightCard
            className="p-6 bg-gradient-to-br from-black/60 to-black/80 backdrop-blur-xl border border-gray-800 rounded-xl transition-all duration-300 hover:border-[#40A6FF] shadow-lg"
            spotlightColor="rgba(64, 166, 255, 0.15)"
            delay={0.05}
          >
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6 mb-6">
              <motion.div
                className="w-24 h-24 rounded-full bg-gradient-to-r from-[#40A6FF] to-[#2D63FF] flex items-center justify-center text-3xl font-bold text-white overflow-hidden shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, 5, 0] }}
                transition={{
                  scale: { duration: 0.4, ease: "backOut" },
                  rotate: { duration: 1, ease: "easeInOut", delay: 0.2 }
                }}
                whileHover={{
                  scale: 1.03,
                  boxShadow: "0 0 20px rgba(64, 166, 255, 0.5)",
                  transition: { duration: 0.2 }
                }}
              >
                {userInitial}
              </motion.div>

              <div className="flex-1">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="text-center md:text-left"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:space-x-3 mb-2">
                    <h2 className="text-2xl font-bold text-white mb-1 md:mb-0">
                      {user.user_metadata?.full_name || 'Anonymous'}
                    </h2>
                    <Badge text={profile?.plan ? profile.plan.toUpperCase() : "FREE"} />
                  </div>
                  <p className="text-gray-400 mb-3">
                    Member since{" "}
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                      : "Unknown"}
                  </p>

                </motion.div>

                <motion.hr
                  initial={{ opacity: 0, width: "0%" }}
                  animate={{ opacity: 0.5, width: "100%" }}
                  transition={{ duration: 0.5, delay: 0.38 }}
                  className="border-gray-700 my-3 md:my-4"
                />

                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:space-x-8 space-y-3 md:space-y-0">
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Email</label>
                      <p className="text-white font-medium">{user.email}</p>
                    </div>

                    <div className="flex-1">
                      <label className="text-sm text-gray-400 block mb-1">User ID</label>
                      <div className="flex items-center space-x-2">
                        <code className="text-white bg-white/5 px-3 py-1 rounded text-sm font-mono overflow-x-auto max-w-full">{user.id}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(user.id)}
                          className="hover:bg-white/10 transition-colors duration-200"
                        >
                          <Copy className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </AnimatedSpotlightCard>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AnimatedSpotlightCard
              className="p-4 bg-gradient-to-br from-black/60 to-black/80 backdrop-blur-xl border border-gray-800 rounded-xl transition-all duration-300 hover:border-[#FFA500] shadow-md"
              spotlightColor="rgba(255, 165, 0, 0.15)"
              delay={0.1}
            >
              <AnimatedStat
                label="Current Plan"
                value={profile?.plan ? profile?.plan.charAt(0).toUpperCase() + profile?.plan.slice(1) : "Free"}
                loading={loading}
                delay={0.2}
                color="text-gradient-to-r from-yellow-300 to-amber-500"
              />
            </AnimatedSpotlightCard>

            <AnimatedSpotlightCard
              className="p-4 bg-gradient-to-br from-black/60 to-black/80 backdrop-blur-xl border border-gray-800 rounded-xl transition-all duration-300 hover:border-[#00FF7F] shadow-md"
              spotlightColor="rgba(0, 255, 127, 0.15)"
              delay={0.15}
            >
              <AnimatedStat
                label="Available Credits"
                value={profile?.credits ?? '0'}
                loading={loading}
                delay={0.25}
                color="text-gradient-to-r from-green-300 to-emerald-500"
              />
            </AnimatedSpotlightCard>

            <AnimatedSpotlightCard
              className="p-4 bg-gradient-to-br from-black/60 to-black/80 backdrop-blur-xl border border-gray-800 rounded-xl transition-all duration-300 hover:border-[#FF007F] shadow-md"
              spotlightColor="rgba(255, 0, 127, 0.15)"
              delay={0.2}
            >
              <AnimatedStat
                label="Active GPUs"
                value="0"
                loading={loading}
                delay={0.3}
                color="text-gradient-to-r from-pink-300 to-rose-500"
              />
            </AnimatedSpotlightCard>
          </div>

          {/* Activity */}
          <AnimatedSpotlightCard
            className="p-6 bg-gradient-to-br from-black/60 to-black/80 backdrop-blur-xl border border-gray-800 rounded-xl transition-all duration-300 hover:border-[#ADD8E6] shadow-lg"
            spotlightColor="rgba(173, 216, 230, 0.15)"
            delay={0.25}
          >
            <motion.div
              className="flex items-center justify-between mb-4"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <h3 className="text-xl font-bold text-white">Recent Activity</h3>
              <span className="text-sm text-gray-400">Last 30 days</span>
            </motion.div>

            <motion.div
              className="text-gray-300 text-center py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.35 }}
            >
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 0.6, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="w-12 h-12 mb-3 text-gray-400"
                >
                  <Activity size={48} strokeWidth={1.5} />
                </motion.div>
                <p className="font-medium mb-1">No recent activity</p>
                <p className="text-sm text-gray-400">Your activity will appear here</p>
              </div>
            </motion.div>
          </AnimatedSpotlightCard>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;