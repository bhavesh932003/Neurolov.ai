'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X as CloseIcon, 
  Copy, 
  Share2, 
  Facebook, 
  Linkedin, 
  Link as LinkIcon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { FaSquareXTwitter } from "react-icons/fa6";
import { FaWhatsapp } from "react-icons/fa6";

interface SocialShareModalProps {
    referralCode?: string;
    isOpen: boolean;
    onClose: () => void;
    platformName?: string;
    inviteLink?: string;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
    isOpen,
    onClose,
    platformName = 'NeuroPlatform',
    inviteLink = 'https://example.com/invite/UNIQUE_CODE',
    referralCode
}) => {
    const [isCopied, setIsCopied] = useState(false);

    const socialPlatforms = [
        {
            name: 'X',
            icon: <FaSquareXTwitter className="w-6 h-6" />,
            color: 'from-[#000000] to-[#14171A]'
        },
        {
            name: 'Facebook',
            icon: <Facebook className="w-6 h-6" />,
            color: 'from-[#1877F2] to-[#1877F2]'
        },
        {
            name: 'LinkedIn',
            icon: <Linkedin className="w-6 h-6" />,
            color: 'from-[#0077B5] to-[#0077B5]'
        },
        {
            name: 'WhatsApp',
            icon: <FaWhatsapp className="w-6 h-6" />,
            color: 'from-[#25D366] to-[#25D366]'
        }
    ];

    const copyToClipboard = async () => {
        try {
            const copyText = referralCode 
                ? `${inviteLink}` 
                : inviteLink;
            
            await navigator.clipboard.writeText(copyText);
            setIsCopied(true);
            toast.success('Invite link copied!', {
                icon: '📋',
                duration: 2000
            });
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy link');
        }
    };

    const openSocialShare = (shareUrl: string) => {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    };

    // Construct share message with referral code
    const getShareMessage = (platform: string) => {
        const baseMessage = referralCode 
            ? `Join me on ${platformName}! Use my invite link ${inviteLink} and referral code ${referralCode} to sign up.`
            : `Join me on ${platformName}! Use my invite link ${inviteLink}`;

        // Encode the message for different platforms
        const encodedMessage = encodeURIComponent(baseMessage);

        switch (platform) {
            case 'X':
                return `https://twitter.com/intent/tweet?text=${encodedMessage}`;
            case 'Facebook':
                return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}&quote=${encodedMessage}`;
            case 'LinkedIn':
                return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteLink)}&summary=${encodedMessage}`;
            case 'WhatsApp':
                return `https://wa.me/?text=${encodedMessage}`;
            default:
                return inviteLink;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl shadow-2xl w-96 p-8 relative overflow-hidden"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                        {/* Animated Background Glow */}
                        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-[#40A6FF]/40 to-[#2D63FF]-500/40 rounded-full animate-pulse opacity-30 blur-3xl"></div>

                        {/* Close Button */}
                        <motion.button
                            className="absolute top-4 right-4 text-gray-300 hover:text-white"
                            onClick={onClose}
                            whileHover={{ rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <CloseIcon className="w-5 h-5" />
                        </motion.button>

                        {/* Header */}
                        <div className="text-center mb-6 relative z-10">
                            <motion.div
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Share2 className="mx-auto w-12 h-12 text-blue-400 mb-4" />
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text">
                                    Invite Friends
                                </h2>
                                <p className="text-sm text-gray-400 mt-2">
                                    Spread the word and earn rewards!
                                </p>
                            </motion.div>
                        </div>

                        {/* Social Share Icons */}
                        <motion.div 
                            className="grid grid-cols-4 gap-4 mb-6 relative z-10"
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                    opacity: 1,
                                    transition: {
                                        delayChildren: 0.3,
                                        staggerChildren: 0.1
                                    }
                                }
                            }}
                        >
                            {socialPlatforms.map((platform) => (
                                <motion.button
                                    key={platform.name}
                                    className={`p-3 rounded-xl bg-gradient-to-br ${platform.color} text-white`}
                                    onClick={() => {
                                        const shareUrl = getShareMessage(platform.name);
                                        openSocialShare(shareUrl);
                                    }}
                                    variants={{
                                        hidden: { y: 20, opacity: 0 },
                                        visible: { y: 0, opacity: 1 }
                                    }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    {platform.icon}
                                </motion.button>
                            ))}
                        </motion.div>

                        {/* Invite Link Section */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="relative z-10"
                        >
                            <div className="bg-gradient-to-br from-[#2C3E50]/30 to-[#3498DB]/10 rounded-lg p-3 flex items-center border border-white/10">
                                <LinkIcon className="w-5 h-5 mr-3 text-gray-300" />
                                <input
                                    type="text"
                                    value={referralCode 
                                        ? `${inviteLink} | Referral Code: ${referralCode}` 
                                        : inviteLink}
                                    readOnly
                                    className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                                />
                                <motion.button
                                    className={`ml-2 ${isCopied ? 'text-green-400' : 'text-gray-300'}`}
                                    onClick={copyToClipboard}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    {isCopied ? '✓' : <Copy className="w-4 h-4" />}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};