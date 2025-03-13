'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TalkHub } from './components/TalkHub';
import { ProfileNewsFeed } from './components/ProfileNewsFeed';
import { Card } from '@/components/ui/card';
import { Users, MessageSquare, TrendingUp, Award } from 'lucide-react';
import { ComingSoonOverlay } from '@/components/ComingSoonOverlay';
import { SocialShareModal } from '@/components/modals/SocialShareModal';
import { getSupabaseClient } from '@/app/auth/supabase';
import { useRouter } from 'next/navigation';


export default function CommunityPage() {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const router = useRouter()
  const [refCode, setRefCode] = useState("")

  const localLink = "http://localhost:3000"
  const productionLink = "https://app.neurolov.ai"


  useEffect(() => {
    const fetchUser = async () => {
      const supabase = getSupabaseClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      if (session?.user) {

      } else if (error || !session) {

        router.push('/');
      }
    };
    fetchUser();
  }, []);


  return (
    <>
      <SocialShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        referralCode={refCode}
        platformName="NeuroPlatform"
        inviteLink={`${productionLink}?referral=${encodeURIComponent(refCode)}`}
      />
      <div className="h-[100dvh] bg-black text-white relative overflow-hidden flex flex-col">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(24,24,27,0),rgba(0,0,0,1))]" />
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
              x: [0, 50, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          <motion.div
            className="absolute top-60 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3],
              x: [0, -30, 0],
              y: [0, 50, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>

        <div className="relative flex-1 container mx-auto py-4 max-w-6xl overflow-hidden">
          {/* Main Content */}
          <div className="relative z-10 h-full">
            <div className="grid h-full grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Profile & News Section */}
              <div className="lg:col-span-5 h-full overflow-auto">
                <div className="h-full pr-2 space-y-4">
                  <ProfileNewsFeed setRefCode={setRefCode} setIsShareModalOpen={setIsShareModalOpen} />
                </div>
              </div>

              {/* TalkHub Section */}
              <div className="lg:col-span-7 h-full">
                <Tabs defaultValue="talk" className="h-full flex flex-col">
                  <TabsList className="w-full bg-black/40 border border-blue-500/20 backdrop-blur-xl flex-shrink-0">
                    <TabsTrigger
                      value="talk"
                      className="flex-1 text-sm data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
                    >
                      Talk Hub
                    </TabsTrigger>
                    <TabsTrigger
                      value="leaderboard"
                      className="flex-1 text-sm data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
                    >
                      Leaderboard
                    </TabsTrigger>
                  </TabsList>
                  <div className="flex-1 overflow-hidden">
                    <TabsContent value="talk" className="h-full mt-0">
                      <div className="h-full overflow-auto pr-2">
                        <TalkHub />
                      </div>
                    </TabsContent>
                    <TabsContent value="leaderboard" className="h-full mt-0">
                      <div className="h-full overflow-auto pr-2">
                        <Card className="p-6 border border-blue-500/20 bg-black/40 backdrop-blur-xl">
                          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Coming Soon
                          </h2>
                          <p className="text-gray-400 mt-2">
                            The leaderboard feature is currently under development.
                          </p>
                        </Card>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
        {/* 
      <ComingSoonOverlay 
        title="Community Hub"
        description="Our community hub is under development. Get ready to connect, share, and collaborate!"
        version="2.0"
        type="fixed"
        className="z-[9999]"
      /> */}
      </div>
    </>
  );
}
