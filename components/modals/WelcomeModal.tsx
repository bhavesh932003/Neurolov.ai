'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, SkipForward } from 'lucide-react';
import { Confetti } from '@/app/(secondary-components)/community/components/Confetti';
import { useRouter } from 'next/navigation';
import { ModalVisibilityManager } from '@/utils/modal-visiblity';

interface WelcomeModalProps {
isCloseButton: boolean;
  isOpen: boolean;
  pageName: string;
  onClose: () => void;
  initialCredits?: number;
  stages: {
    title: string;
    description: string;
    icon: React.ReactNode;
    confettiTrigger?: boolean;
    actionButton?: {
      label: string;
      action: () => void;
    };
  }[];
    singlePage?: boolean;
    
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ 
  isOpen, 
  onClose, 
  initialCredits,
  stages,
    singlePage = false,
  isCloseButton,
  pageName
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [stage, setStage] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Check modal visibility
  useEffect(() => {
    if (isOpen) {
      const hasSeenModal = ModalVisibilityManager.hasSeenModal(pageName);
      setIsModalVisible(!hasSeenModal);
    }
  }, [isOpen, pageName]);

  // Handle modal close and mark as seen
  const handleModalClose = () => {
    ModalVisibilityManager.markModalAsSeen(pageName);
    setIsModalVisible(false);
    onClose();
  };

  // Trigger confetti effect
  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
  };

  // Handle stage navigation
  const handleNextStage = () => {
    const currentStage = stages[stage];

    if (currentStage.confettiTrigger) {
      triggerConfetti();
    }

    if (stage < stages.length - 1) {
      setStage(stage + 1);
    } else {
      handleModalClose();
    }
  };

  // Reset stage when modal opens
  useEffect(() => {
    if (isOpen) {
      setStage(0);
      setShowConfetti(false);
    }
  }, [isOpen]);

  // Automatic confetti trigger
  useEffect(() => {
    if (isOpen && stages[stage]?.confettiTrigger && !showConfetti) {
      triggerConfetti();
    }
  }, [stage, isOpen, showConfetti, stages]);

  // Don't render if modal should not be visible
  if (!isModalVisible) return null;

  const isSinglePageModal = singlePage || stages.length === 1;
  const isLastStage = stage === stages.length - 1;
  return (
    <>
      {/* Confetti Component */}
      {showConfetti && (
        <div className="fixed inset-0 z-[60] pointer-events-none">
          <Confetti 
            active={showConfetti}   
            duration={5000} 
            recycle={false} 
          />
        </div>
      )}

      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && isSinglePageModal) {
             handleModalClose()
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-8 max-w-lg w-full relative overflow-hidden"
            onClick={(e) => e.stopPropagation()} 
          >
          
         {isCloseButton && (singlePage ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 z-20 hover:rounded-full hover:bg-white/10"
                onClick={handleModalClose}
              >
                <X className="w-6 h-6 text-gray-300" />
              </Button>
            ) : (
             isLastStage ? (<Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 z-20 hover:rounded-full hover:bg-white/10"
                onClick={handleModalClose}
              >
                <X className="w-6 h-6 text-gray-300" />
              </Button>) : ( <Button 
                variant="ghost" 
                className="absolute top-4 right-4 z-20 hover:bg-white/10 text-gray-300 text-sm"
                onClick={handleModalClose}
              >
                <SkipForward className="w-4 h-4 mr-1" />
                Skip
              </Button>)
            ))}

            {/* Animated Background Glow */}
            <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-[#40A6FF]/40 to-[#2D63FF]-500/40 rounded-full animate-pulse opacity-30 blur-3xl"></div>

            {/* Content */}
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="relative z-10 text-center"
            >
              {stages[stage].icon}
              
              <h2 className="text-3xl font-bold mt-4 bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text">
                {stages[stage].title}
              </h2>
              
              <p className="text-gray-300 mt-2 mb-6">
                {stages[stage].description}
              </p>

              {/* Conditional Credit Badge */}
              {initialCredits && stage === 1 && (
                <div className="flex justify-center mb-6">
                  <Badge 
                    variant="secondary" 
                    className="text-xl px-4 py-2 bg-gradient-to-r from-green-400/20 to-blue-500/20 animate-pulse"
                  >
                    🎉 {initialCredits} Credits 🎉
                  </Badge>
                </div>
              )}

              {/* Action Buttons */}
              {singlePage || isLastStage ? (
                <div className="space-y-4">
                  {stages[stage].actionButton ? (
                    <Button 
                      onClick={() => {
                        handleModalClose()
                        stages[stage].actionButton?.action();

                      }}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {stages[stage].actionButton?.label}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </motion.div>

            {/* Stage Navigation for Multi-Stage Modal */}
            {!singlePage &&  !isLastStage && (
              <>
                <div className="mt-6 flex justify-center space-x-4">
                  {stages.map((_, index) => (
                    <div 
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === stage ? 'bg-blue-500' : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>

                <Button 
                  onClick={handleNextStage}
                  className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700"
                >
                  Next
                </Button>
              </>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default WelcomeModal;