import { useState, useEffect, useRef, useCallback } from 'react';
import { getSupabaseClient } from '@/app/auth/supabase';
import { useQuestProgress } from './useQuestsProgress';

interface UseTimeSpentTrackerOptions {
  targetDuration: number; // In seconds
  messageType: string;
  onComplete?: () => void;
  localProgressIncrement?: number;
  showToast?: boolean;
  storageKey?: string; // Optional custom storage key
}

export function useTimeSpentTracker({
  targetDuration,
  messageType,
  onComplete,
  localProgressIncrement = 1,
  showToast = true,
  storageKey
}: UseTimeSpentTrackerOptions) {
  // Generate a storage key based on message type if not provided
  const timeTrackingKey = storageKey || `time_spent_${messageType}`;
  
  // Initialize time spent from localStorage if available
  const [timeSpent, setTimeSpent] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedTime = localStorage.getItem(timeTrackingKey);
      return savedTime ? parseInt(savedTime, 10) : 0;
    }
    return 0;
  });
  
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveTimeRef = useRef<number>(Date.now());
  const isVisibleRef = useRef<boolean>(true);
  const supabase = getSupabaseClient();
  
  // Use the existing quest progress hook
  const { updateQuestProgress } = useQuestProgress();
  
  // Save time spent to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(timeTrackingKey, timeSpent.toString());
    }
  }, [timeSpent, timeTrackingKey]);
  
  // Check if the quest is already completed on mount
  useEffect(() => {
    const checkQuestCompletion = () => {
      const savedQuests = localStorage.getItem('quests_data');
      if (!savedQuests) return false;
      
      try {
        const questsData = JSON.parse(savedQuests);
        const targetQuest = questsData.find((q: any) => q.message_type === messageType);
        
        if (targetQuest && targetQuest.isCompleted) {
          setIsComplete(true);
          return true;
        }
        
        // If not completed but we have progress, update our timeSpent to match
        if (targetQuest && targetQuest.current_progress > 0) {
          // Only update if localStorage value is less than what's in the quest data
          // This helps prevent regression if timeSpent is already higher
          const currentTimeSpent = parseInt(localStorage.getItem(timeTrackingKey) || '0', 10);
          if (targetQuest.current_progress > currentTimeSpent) {
            setTimeSpent(targetQuest.current_progress);
          }
        }
        
        return false;
      } catch (err) {
        console.error('Error checking quest completion:', err);
        return false;
      }
    };
    
    checkQuestCompletion();
  }, [messageType, timeTrackingKey]);
  
  // Function to update backend progress
  const updateBackendQuestProgress = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        console.log('User not logged in, skipping backend update');
        return;
      }
      
      const { data, error } = await supabase.rpc("update_quest_progress", {
        action_value: targetDuration,
        user_uuid: userData.user.id,
        message_type: messageType,
      });
      
      if (error) {
        console.error("Error updating quest progress in backend:", error);
        return;
      }
      
      console.log("Quest progress updated successfully in backend:", data);
      
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error("Failed to update backend quest progress:", err);
    }
  }, [supabase, targetDuration, messageType, onComplete]);
  
  // Check for user activity
  useEffect(() => {
    const handleUserActivity = () => {
      lastActiveTimeRef.current = Date.now();
    };
    
    // Track various user activities
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keypress', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    
    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
    };
  }, []);
  
  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      if (!isVisibleRef.current && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      } else if (isVisibleRef.current && !timerRef.current && !isComplete) {
        startTracking();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isComplete]);
  
  // Handle beforeunload to save final state before page refresh/navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem(timeTrackingKey, timeSpent.toString());
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [timeSpent, timeTrackingKey]);
  
  const startTracking = useCallback(() => {
    if (timerRef.current || isComplete) return;
  
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - lastActiveTimeRef.current;
  
      // If user has been inactive for more than 30 seconds, don't count the time
      if (inactiveTime > 30000) {
        lastActiveTimeRef.current = now;
        return;
      }
  
      // Only increment time if the page is visible
      if (isVisibleRef.current) {
        setTimeSpent((prev) => {
          const newTimeSpent = prev + 1;
  
          // Use the existing updateQuestProgress function
          const result = updateQuestProgress(messageType, localProgressIncrement);
  
          // Check if the quest was just completed
          if (result?.isComplete && !isComplete) {
            setIsComplete(true);
            updateBackendQuestProgress();
  
            // Clear the interval once we're done
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
              resetTimeSpent();
            }
          }
  
          return newTimeSpent;
        });
      }
    }, 1000); // Ensure this is exactly 1000ms (1 second)
  
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isComplete, messageType, localProgressIncrement, updateQuestProgress, updateBackendQuestProgress]);
  
  // Start tracking when component mounts if quest is not already completed
  useEffect(() => {
    if (!isComplete) {
      startTracking();
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [startTracking, isComplete]);
  
  // Function to reset the time spent (useful for testing or manual resets)
  const resetTimeSpent = useCallback(() => {
    setTimeSpent(0);
    localStorage.setItem(timeTrackingKey, '0');
  }, [timeTrackingKey]);
  
  return {
    timeSpent,
    isComplete,
    progress: Math.min((timeSpent / targetDuration) * 100, 100),
    resetTimeSpent
  };
}