'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Crown, ChevronDown, Trophy, Users, Gift, Copy, Medal, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { getSupabaseClient } from '@/app/auth/supabase';
import { useUser } from '@/app/auth/useUser';
import toast from 'react-hot-toast';
import { Confetti } from './Confetti';

interface ReferralSlot {
  isActive: boolean;
  percentage: number;
  earnings: number;
}

interface RedeemCode {
  id: string;
  code: string;
  credit_amount: number;
  max_uses: number | null;
  times_used: number;
  expires_at: string | null;
  created_at: string;
  status: 'Available' |  'Expired';
  isRedeemedByUser?: boolean;
}

export const GamifiedProfile: React.FC = () => {
  const { user, loading } = useUser();
  const [activeTab, setActiveTab] = useState<'achievements' | 'referrals' | 'redeem' | 'collections'>('achievements');
  const [isExpanded, setIsExpanded] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [redeemCodes, setRedeemCodes] = useState<RedeemCode[]>([]);
  const [newRedeemCode, setNewRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userLevel, setUserLevel] = useState(1);
  const [previousLevel, setPreviousLevel] = useState(1);
  const [previousCredits, setPreviousCredits] = useState(0);
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);
  const [showCreditAnimation, setShowCreditAnimation] = useState(false);
  const [creditAnimationValue, setCreditAnimationValue] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);
  
  const creditCountRef = useRef<HTMLSpanElement>(null);
  const progressControls = useAnimation();
  const [showConfetti, setShowConfetti] = useState(false);
  const levelControls = useAnimation();

  const referralSlots: ReferralSlot[] = [
    { isActive: false, percentage: 10, earnings: 0 },
    { isActive: false, percentage: 5, earnings: 0 },
    { isActive: false, percentage: 2.5, earnings: 0 },
    { isActive: false, percentage: 1, earnings: 0 }
  ];

  // Calculate progress percentage based on credits
  useEffect(() => {
    if (userProfile?.credits) {
      const nextLevelCredits = userLevel * 100;
      const previousLevelCredits = (userLevel - 1) * 100;
      const currentProgress = userProfile.credits - previousLevelCredits;
      const requiredProgress = nextLevelCredits - previousLevelCredits;
      const newPercentage = Math.min(Math.floor((currentProgress / requiredProgress) * 100), 100);
      
      // Animate progress bar
      progressControls.start({
        width: `${newPercentage}%`,
        transition: { duration: 1, ease: "easeOut" }
      });
      
      setProgressPercentage(newPercentage);
    }
  }, [userProfile?.credits, userLevel, progressControls]);

  // Generate referral code
  const generateReferralCode = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    const code = `NEURO-${timestamp.slice(-4)}-${randomStr.toUpperCase()}`;
    setReferralCode(code);
  };

  // Copy referral code
  const copyReferralCode = async () => {
    if (referralCode) {
      await navigator.clipboard.writeText(referralCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Sample referral data
  const referrals: any[] = [
    { username: 'CryptoKing', level: 42, income: 5000, percentage: 10 },
    { username: 'BlockMaster', level: 28, income: 3000, percentage: 5 },
    { username: 'MiningPro', level: 15, income: 2000, percentage: 2.5 },
    { username: 'HashMaster', level: 8, income: 1000, percentage: 1 },
  ];

  const achievements = [
    { title: 'First Mining', description: 'Complete your first mining session', progress: 100 },
    { title: 'Power User', description: 'Mine for 100 hours', progress: 75 },
    { title: 'Community Leader', description: 'Refer 5 active users', progress: 80 },
    { title: 'Early Adopter', description: 'Join during beta phase', progress: 100 },
  ];

  const collections: any[] = [
    { 
      id: 1,
      name: 'BETA Champion',
      icon: '👑',
      rarity: 'BETA',
      description: 'Participated in closed beta testing',
      acquired: '2024-12-15'
    },
    { 
      id: 2,
      name: 'Neural Architect',
      icon: '🧠',
      rarity: 'Mythic',
      description: 'First to achieve 1M neural connections',
      acquired: '2024-12-25'
    },
    {
      id: 3,
      name: 'Early Pioneer',
      icon: '🚀',
      rarity: 'Legendary',
      description: 'One of the first 100 users',
      acquired: '2024-12-28'
    },
    {
      id: 4,
      name: 'Mining Master',
      icon: '⛏️',
      rarity: 'Epic',
      description: 'Mined 1000 blocks',
      acquired: '2025-01-15'
    },
    {
      id: 5,
      name: 'Community Guardian',
      icon: '🛡️',
      rarity: 'Rare',
      description: 'Helped 50 new users',
      acquired: '2025-01-20'
    },
    {
      id: 6,
      name: 'Network Node',
      icon: '🌐',
      rarity: 'Common',
      description: 'Successfully hosted a node for 24 hours',
      acquired: '2025-01-10'
    },
    {
      id: 7,
      name: 'Bug Slayer',
      icon: '🐛',
      rarity: 'Epic',
      description: 'Fixed 5 critical network issues',
      acquired: '2025-01-22'
    },
    {
      id: 8,
      name: 'BETA Explorer',
      icon: '🔍',
      rarity: 'BETA',
      description: 'Discovered a major feature during beta',
      acquired: '2024-12-20'
    }
  ];


  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);
  };

  // Fetch user profile
  useEffect(() => {
    if (!user || !user.id) return;
    
    const fetchUserProfile = async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      
      if (data) {
        if (userProfile) {
          setPreviousCredits(userProfile.credits);
          setPreviousLevel(userLevel);
        }
        
        setUserProfile(data);
        // Calculate level based on credits (simple formula)
        const calculatedLevel = Math.floor(data.credits / 100) + 1;
        
        // Check if level has changed
        if (userLevel !== calculatedLevel && userLevel !== 1) {
          setShowLevelUpAnimation(true);
          setTimeout(() => triggerConfetti(), 300);
          setTimeout(() => setShowLevelUpAnimation(false), 3000);
        }
        
        // Check if credits have changed
        if (userProfile && data.credits > userProfile.credits) {
          setCreditAnimationValue(data.credits - userProfile.credits);
          setShowCreditAnimation(true);
          setTimeout(() => setShowCreditAnimation(false), 2000);
        }
        
        setUserLevel(calculatedLevel);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  // Fetch redeem history
  useEffect(() => {
    if (!user || !user.id) return;
    
    const fetchRedeemHistory = async () => {
      const supabase = getSupabaseClient();
      
      // Fetch redeem_history for the current user
      const { data: historyData, error: historyError } = await supabase
        .from('redeem_history')
        .select('redeem_code_id, redeemed_at')
        .eq('user_id', user.id);
      
      if (historyError) {
        console.error('Error fetching redeem history:', historyError);
        return;
      }
      
      const redeemedCodeIds = historyData?.map(item => item.redeem_code_id) || [];
      
      // Fetch all redeem codes
      const { data: codesData, error: codesError } = await supabase
        .from('redeem_codes')
        .select('*');
      
      if (codesError) {
        console.error('Error fetching redeem codes:', codesError);
        return;
      }
      
      const now = new Date();
      const processedCodes: RedeemCode[] = codesData.map(code => {
        let status: 'Available'  | 'Expired' = 'Available';
        
        // Check if used by this user
        const isRedeemedByUser = redeemedCodeIds.includes(code.id);
        
        // Check if expired
        if (code.expires_at && new Date(code.expires_at) < now) {
          status =  'Expired';
        }
        // Check if max uses reached globally
        else if (code.max_uses !== null && code.times_used >= code.max_uses) {
          status =  'Expired';
        }
        
        return {
          ...code,
          status,
          isRedeemedByUser 
        };
      });
      
      setRedeemCodes(processedCodes);
    };
    
    fetchRedeemHistory();
  }, [user, activeTab]);

  const redeemCode = async () => {
    if (!newRedeemCode.trim() || !user || isRedeeming) return;
    
    setIsRedeeming(true);
    const supabase = getSupabaseClient();
    
    try {
      // Call the redeem_code RPC function
      const { data, error } = await supabase.rpc('redeem_code', {
        code_text: newRedeemCode.trim(),
        user_uuid: user.id
      });
      
      if (error) throw error;
      
      // Check if the redemption was successful
      if (data && data.includes('successful')) {
        // Get the code that was redeemed to know the amount
        const redeemedCode = redeemCodes.find(code => code.code === newRedeemCode.trim());
        const creditAmount = redeemedCode?.credit_amount || 0;
        
  
        const successToast = toast.success('Code successfully redeemed!', {
          duration: 3000,
          icon: '🎉',
        });
        
        // Show floating animation with the amount
        setCreditAnimationValue(creditAmount);
        setShowCreditAnimation(true);
        setTimeout(() => setShowCreditAnimation(false), 2000);
        
        // Refetch user profile to update credits
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileData) {
          setPreviousCredits(userProfile?.credits || 0);
          setUserProfile(profileData);
          
          const calculatedLevel = Math.floor(profileData.credits / 100) + 1;
          
          // Check if level up occurred
          if (calculatedLevel > userLevel) {
            setPreviousLevel(userLevel);
            setUserLevel(calculatedLevel);
            setShowLevelUpAnimation(true);
            setTimeout(() => triggerConfetti(), 300);
            setTimeout(() => setShowLevelUpAnimation(false), 3000);
          }
        }
        
     
        setNewRedeemCode('');
        
        // Refetch redeem history if we're on the redeem tab
        if (activeTab === 'redeem') {
          // Refetch redeem codes
          const { data: historyData } = await supabase
            .from('redeem_history')
            .select('redeem_code_id, redeemed_at')
            .eq('user_id', user.id);
            
          const redeemedCodeIds = historyData?.map(item => item.redeem_code_id) || [];
          
          const { data: codesData } = await supabase
            .from('redeem_codes')
            .select('*');
            
          const now = new Date();
          const processedCodes: RedeemCode[] = codesData.map(code => {
            let status: 'Available' | 'Expired' = 'Available';
            
            // Check if used by this user
            const isRedeemedByUser = redeemedCodeIds.includes(code.id);
            
            // Check if expired
            if (code.expires_at && new Date(code.expires_at) < now) {
              status = 'Expired';
            }
            // Check if max uses reached globally
            else if (code.max_uses !== null && code.times_used >= code.max_uses) {
              status = 'Expired';
            }
          
            return {
              ...code,
              status,
              isRedeemedByUser
            };
          });
          
          setRedeemCodes(processedCodes);
        }
      } else {
        
        toast.error('Failed to redeem code', {
          duration: 3000,
        });
      }
    } catch (err) {
      console.error('Error redeeming code:', err);
      toast.error('Failed to redeem code', {
        duration: 3000,
      });
    } finally {
      setIsRedeeming(false);
    }
  };
 
  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success('Copied!', {
      duration: 1500,
      icon: '📋',
    });
  };

  return (
    <div className="h-[calc(100vh-16rem)] flex flex-col relative">
       <Confetti active={showConfetti} />
      {/* Level Up Animation Overlay */}
      <AnimatePresence>
        {showLevelUpAnimation && (
          <motion.div 
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="flex flex-col items-center"
              initial={{ scale: 0.5, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.5, y: -50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.div 
                className="text-6xl mb-4"
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 2, repeatType: "reverse" }}
              >
                🎮
              </motion.div>
              <motion.div 
                className="text-3xl font-bold text-white mb-2"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 2, repeatType: "reverse" }}
              >
                LEVEL UP!
              </motion.div>
              <div className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent text-5xl font-bold mb-6">
                {previousLevel} → {userLevel}
              </div>
              <motion.div 
                className="text-lg text-blue-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                New rewards unlocked!
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Header - Fixed */}
      <Card className="relative overflow-hidden border border-blue-500/20 bg-black/40 backdrop-blur-xl flex-shrink-0">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div 
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-[2px]"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    <span className="text-lg font-bold text-white">
                      {userProfile?.full_name?.charAt(0) || 'N'}
                    </span>
                  </div>
                </motion.div>
                <motion.div 
                  className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ 
                    duration: 1.5, 
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                >
                  <Crown className="w-3 h-3 text-black" />
                </motion.div>
              </div>
              <div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {userProfile?.full_name || 'NeuroMiner'}
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 relative">
                    Level {userLevel}
                    {/* Level up number animation */}
                    <AnimatePresence>
                      {showLevelUpAnimation && (
                        <motion.span
                          className="absolute -right-5 text-green-400 text-xs"
                          initial={{ y: 0, opacity: 0 }}
                          animate={{ y: -15, opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                        >
                          +1
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={progressControls}
                    />
                  </div>
                  <div className="relative">
                    <span className="text-blue-400" ref={creditCountRef}>
                      {userProfile?.credits || 0} Credits
                    </span>
                    {/* Credits added animation */}
                    <AnimatePresence>
                      {showCreditAnimation && creditAnimationValue > 0 && (
                        <motion.span
                          className="absolute -right-0 -top-4 text-green-400 font-medium"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: -15 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                          +{creditAnimationValue}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden flex-1"
          >
            <Card className="border border-blue-500/20 bg-black/40 backdrop-blur-xl h-full">
              <div className="p-3 h-full flex flex-col">
                {/* Navigation */}
                <div className="flex gap-2 mb-3 flex-shrink-0">
                  {(['achievements', 'referrals', 'redeem', 'collections'] as const).map((tab) => (
                    <motion.div
                      key={tab}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "w-9 h-9 p-0 relative",
                          activeTab === tab
                            ? "bg-blue-500/20 text-blue-400"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                        title={tab.charAt(0).toUpperCase() + tab.slice(1)}
                      >
                        {tab === 'achievements' && <Trophy className="w-4 h-4" />}
                        {tab === 'referrals' && <Users className="w-4 h-4" />}
                        {tab === 'redeem' && <Gift className="w-4 h-4" />}
                        {tab === 'collections' && <Medal className="w-4 h-4" />}
                        
                        {activeTab === tab && (
                          <motion.div
                            className="absolute -bottom-1 left-0 right-0 h-[2px] bg-blue-500"
                            layoutId="activeTab"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                      </Button>
                    </motion.div>
                  ))}
                </div>

                {/* Content with individual scroll */}
                <div className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto no-scrollbar">
                    {activeTab === 'referrals' && (
                      <div className="space-y-4">
                        {/* Referral Code Generator */}
                        <Card className="bg-black/20 border-blue-500/10">
                          <div className="p-3 space-y-3">
                            <h4 className="text-sm font-semibold text-white">Your Referral Code</h4>
                            <div className="flex gap-2">
                              <Input
                                value={referralCode}
                                readOnly
                                placeholder="Generate your referral code"
                                className="bg-black/20 border-blue-500/20 text-sm"
                              />
                              {!referralCode ? (
                                <motion.div
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={generateReferralCode}
                                    className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400"
                                  >
                                    Generate
                                  </Button>
                                </motion.div>
                              ) : (
                                <motion.div whileTap={{ scale: 0.95 }}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={copyReferralCode}
                                    className={cn(
                                      "min-w-[60px] relative overflow-hidden",
                                      isCopied
                                        ? "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                                        : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400"
                                    )}
                                  >
                                    {isCopied && (
                                      <motion.div
                                        className="absolute inset-0 bg-green-500/20"
                                        initial={{ x: "-100%" }}
                                        animate={{ x: 0 }}
                                        transition={{ duration: 0.3 }}
                                      />
                                    )}
                                    <span className="relative z-10">{isCopied ? "Copied!" : "Copy"}</span>
                                  </Button>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </Card>

                        {/* Referral Slots */}
                        <div className="space-y-2">
                          {referralSlots.map((slot, index) => (
                            <motion.div 
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <Card className="bg-black/20 border-blue-500/10">
                                <div className="p-2">
                                  {slot.isActive ? (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-[1.5px]">
                                          <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                                            <span className="text-xs font-bold text-white">U</span>
                                          </div>
                                        </div>
                                        <div>
                                          <p className="text-sm text-white">User Name</p>
                                          <p className="text-xs text-gray-400">Level 1</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm text-green-400">+0 ₦</p>
                                        <p className="text-xs text-gray-400">{slot.percentage}% earnings</p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <motion.div 
                                          className="w-8 h-8 rounded-full border-2 border-dashed border-blue-500/20 flex items-center justify-center"
                                          animate={{ 
                                            borderColor: ["rgba(59, 130, 246, 0.2)", "rgba(59, 130, 246, 0.4)", "rgba(59, 130, 246, 0.2)"],
                                          }}
                                          transition={{ duration: 2, repeat: Infinity }}
                                        >
                                          <Plus className="w-4 h-4 text-blue-400" />
                                        </motion.div>
                                        <div>
                                          <p className="text-sm text-white">Empty Slot</p>
                                          <p className="text-xs text-blue-400">{slot.percentage}% of earnings</p>
                                        </div>
                                      </div>
                                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400"
                                        >
                                          Invite
                                        </Button>
                                      </motion.div>
                                    </div>
                                  )}
                                </div>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'achievements' && (
                      <div className="space-y-2">
                        {achievements.map((achievement, index) => (
                          <motion.div 
                            key={index} 
                            className="space-y-1"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="flex justify-between text-sm">
                            <span className="text-white">{achievement.title}</span>
                            <span className="text-gray-400">{achievement.progress}%</span>
                          </div>
                          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full ${achievement.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${achievement.progress}%` }}
                              transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 + 0.2 }}
                            />
                          </div>
                          <p className="text-xs text-gray-400">{achievement.description}</p>
                          {achievement.progress === 100 && (
                            <motion.div
                              className="flex items-center gap-1 text-xs text-green-400"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.1 + 0.8 }}
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Completed</span>
                            </motion.div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'collections' && (
                    <div className="grid grid-cols-2 gap-2">
                      {collections.map((badge, index) => (
                        <motion.div
                          key={badge.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="bg-black/20 border-blue-500/10 overflow-hidden group">
                            <motion.div 
                              className="p-3 relative"
                              whileHover={{ scale: 1.02 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                              {/* Animated background */}
                              <div className={cn(
                                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                                badge.rarity === 'BETA' && "bg-gradient-to-r from-orange-500/5 via-yellow-500/5 to-orange-500/5",
                                badge.rarity === 'Mythic' && "bg-gradient-to-r from-red-500/5 via-purple-500/5 to-red-500/5",
                                badge.rarity === 'Legendary' && "bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-yellow-500/5",
                                badge.rarity === 'Epic' && "bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5",
                                badge.rarity === 'Rare' && "bg-gradient-to-r from-blue-500/5 via-cyan-500/5 to-blue-500/5",
                                badge.rarity === 'Common' && "bg-gradient-to-r from-gray-500/5 via-slate-500/5 to-gray-500/5"
                              )} />
                              
                              {/* Badge content */}
                              <div className="relative">
                                <div className="flex items-center gap-2 mb-2">
                                  <motion.div 
                                    className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center text-xl",
                                      badge.rarity === 'BETA' && "bg-gradient-to-r from-orange-500/20 to-yellow-500/20",
                                      badge.rarity === 'Mythic' && "bg-gradient-to-r from-red-500/20 to-purple-500/20",
                                      badge.rarity === 'Legendary' && "bg-gradient-to-r from-yellow-500/20 to-orange-500/20",
                                      badge.rarity === 'Epic' && "bg-gradient-to-r from-purple-500/20 to-pink-500/20",
                                      badge.rarity === 'Rare' && "bg-gradient-to-r from-blue-500/20 to-cyan-500/20",
                                      badge.rarity === 'Common' && "bg-gradient-to-r from-gray-500/20 to-slate-500/20"
                                    )}
                                    whileHover={{ rotate: [0, -5, 5, 0] }}
                                    transition={{ duration: 0.5 }}
                                  >
                                    {badge.icon}
                                  </motion.div>
                                  <div>
                                    <h4 className="text-sm font-semibold text-white">{badge.name}</h4>
                                    <span className={cn(
                                      "text-xs px-1.5 py-0.5 rounded-full",
                                      badge.rarity === 'BETA' && "bg-orange-500/10 text-orange-400",
                                      badge.rarity === 'Mythic' && "bg-red-500/10 text-red-400",
                                      badge.rarity === 'Legendary' && "bg-yellow-500/10 text-yellow-400",
                                      badge.rarity === 'Epic' && "bg-purple-500/10 text-purple-400",
                                      badge.rarity === 'Rare' && "bg-blue-500/10 text-blue-400",
                                      badge.rarity === 'Common' && "bg-gray-500/10 text-gray-400"
                                    )}>
                                      {badge.rarity}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-400 mb-1">{badge.description}</p>
                                <p className="text-xs text-gray-500">Acquired: {new Date(badge.acquired).toLocaleDateString()}</p>
                              </div>

                              {/* Shine effect */}
                              <motion.div
                                className={cn(
                                  "absolute inset-0 -skew-x-45",
                                  badge.rarity === 'BETA' && "bg-gradient-to-r from-transparent via-orange-400/10 to-transparent",
                                  badge.rarity === 'Mythic' && "bg-gradient-to-r from-transparent via-red-400/10 to-transparent",
                                  badge.rarity === 'Legendary' && "bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent",
                                  badge.rarity === 'Epic' && "bg-gradient-to-r from-transparent via-purple-400/10 to-transparent",
                                  badge.rarity === 'Rare' && "bg-gradient-to-r from-transparent via-blue-400/10 to-transparent",
                                  badge.rarity === 'Common' && "bg-gradient-to-r from-transparent via-gray-400/10 to-transparent"
                                )}
                                animate={{
                                  x: ["100%", "-100%"]
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  repeatDelay: 3
                                }}
                              />
                            </motion.div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'redeem' && (
                    <div className="space-y-2">
                      {/* List of redeem codes */}
                      {redeemCodes.map((code, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="bg-black/20 border-blue-500/10">
                            <div className="p-2 flex items-center justify-between">
                              <div>
                                <p className="text-sm text-white">{code.code}</p>
                                <p className="text-xs text-gray-400">{code.credit_amount} Credits</p>
                              </div>
                              <div className="flex items-center gap-2">
                                
                                {/* Display status badge */}
                                {
                                  code.status !== 'Available' && (
                                    <motion.span 
                                      className={cn(
                                        "text-xs px-2 py-0.5 rounded-full",
                                        code.status === 'Expired' && "bg-red-500/10 text-red-400"
                                      )}
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: 0.2 }}
                                    >
                                      { 'Expired' }
                                    </motion.span>
                                  )
                                }
                                {
                                  code.status === 'Available' && !code.isRedeemedByUser && (
                                    <motion.span 
                                      className={cn(
                                        "text-xs px-2 py-0.5 rounded-full",
                                        code.status === 'Available' && "bg-green-500/10 text-green-400"
                                      )}
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: 0.2 }}
                                    >
                                      {'Available'}
                                    </motion.span>
                                  )
                                }

                                {/* Display badge for redeemed by user */}
                                {code.isRedeemedByUser && (
                                  <motion.span 
                                    className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.2 }}
                                  >
                                    Redeemed
                                  </motion.span>
                                )}
                                
                                {code.status === 'Available' && code.isRedeemedByUser === false && (
                                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 hover:bg-blue-500/10"
                                      onClick={() => copyCode(code.code)}
                                    >
                                      <Copy className="w-3.5 h-3.5 text-blue-400" />
                                    </Button>
                                  </motion.div>
                                )}
                              </div>
                            </div>
                            {code.max_uses && (code.status === 'Available' || code.isRedeemedByUser) && (
                              <div className="px-2 pb-2">
                                <div className="flex justify-between text-xs text-gray-400">
                                  <span>Uses: {code.times_used}/{code.max_uses}</span>
                                  {code.expires_at && (
                                    <span>Expires: {new Date(code.expires_at).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Card>
                        </motion.div>
                      ))}
                      
                      {/* Redeem Code Input */}
                      <motion.div 
                        className="relative"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <input
                          type="text"
                          placeholder="Enter code"
                          value={newRedeemCode}
                          onChange={(e) => setNewRedeemCode(e.target.value)}
                          className="w-full bg-black/20 border border-blue-500/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50"
                        />
                        <div
                          
                        >
                          <Button
                            size="sm"
                            className="absolute right-1 top-1 h-6 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs"
                            onClick={redeemCode}
                            disabled={isRedeeming || !newRedeemCode.trim()}
                          >
                            {isRedeeming ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full"
                              />
                            ) : "Redeem"}
                          </Button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
};