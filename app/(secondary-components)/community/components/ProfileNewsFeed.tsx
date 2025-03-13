'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { GamifiedProfile } from './GamifiedProfile';
import { NewsFeed } from './NewsFeed';
import { UserCircle2, Newspaper } from 'lucide-react';

export const ProfileNewsFeed: React.FC = ({setRefCode, setIsShareModalOpen} : any) => {
  const [showProfile, setShowProfile] = useState(true);

  return (
    <div className="relative h-[calc(100vh-2rem)]">
      {/* Content Container */}
      <div className="relative w-full h-full bg-black/20 rounded-lg border border-blue-500/20 backdrop-blur-sm overflow-hidden">
        {/* Toggle Switch */}
        <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-black/40 border-b border-blue-500/20 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 rounded-full blur-lg" />
                <Card className="relative border-0 bg-black/20 backdrop-blur-sm overflow-hidden">
                  <div className="p-0.5">
                    <div className="relative flex items-center">
                      {/* Animated Background */}
                      <motion.div
                        className="absolute h-full w-1/2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full"
                        animate={{
                          x: showProfile ? 0 : '100%',
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 100,
                          damping: 15,
                        }}
                      />
                      
                      {/* Profile Button */}
                      <motion.button
                        onClick={() => setShowProfile(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors relative z-10 text-sm
                          ${showProfile ? 'text-blue-400' : 'text-gray-500 hover:text-gray-400'}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <UserCircle2 className="w-3.5 h-3.5" />
                        <span className="text-sm font-medium">Profile</span>
                      </motion.button>

                      {/* News Button */}
                      <motion.button
                        onClick={() => setShowProfile(false)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors relative z-10 text-sm
                          ${!showProfile ? 'text-purple-400' : 'text-gray-500 hover:text-gray-400'}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Newspaper className="w-3.5 h-3.5" />
                        <span className="text-sm font-medium">News</span>
                      </motion.button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scrollable Content Area */}
        <div className="h-full pt-16 overflow-hidden">
          <div className="h-full overflow-y-auto no-scrollbar">
            <div className="px-3 pb-3">
              <AnimatePresence mode="wait">
                {showProfile ? (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{
                      duration: 0.4,
                      ease: [0.4, 0, 0.2, 1]
                    }}
                  >
                    <div className="relative">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-blue-500/10 rounded-lg blur-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                      <GamifiedProfile setIsShareModalOpen={setIsShareModalOpen} setRefCode={setRefCode} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="news"
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{
                      duration: 0.4,
                      ease: [0.4, 0, 0.2, 1]
                    }}
                  >
                    <div className="relative">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-purple-500/10 rounded-lg blur-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                      <NewsFeed />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Ambient Background Animation */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: showProfile 
            ? [
                'radial-gradient(600px circle at 0% 0%, rgba(59, 130, 246, 0.03) 0%, transparent 70%)',
                'radial-gradient(600px circle at 100% 100%, rgba(59, 130, 246, 0.03) 0%, transparent 70%)',
                'radial-gradient(600px circle at 0% 0%, rgba(59, 130, 246, 0.03) 0%, transparent 70%)'
              ]
            : [
                'radial-gradient(600px circle at 0% 0%, rgba(168, 85, 247, 0.03) 0%, transparent 70%)',
                'radial-gradient(600px circle at 100% 100%, rgba(168, 85, 247, 0.03) 0%, transparent 70%)',
                'radial-gradient(600px circle at 0% 0%, rgba(168, 85, 247, 0.03) 0%, transparent 70%)'
              ]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );
};
