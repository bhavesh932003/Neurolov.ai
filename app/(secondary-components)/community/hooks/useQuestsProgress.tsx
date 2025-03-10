
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { format, isAfter, startOfDay, parseISO } from 'date-fns';
import { getSupabaseClient } from '@/app/auth/supabase';

export interface QuestProgress {
  id: string;
  previousProgress: number;
  currentProgress: number;
  isCompleted: boolean;
  isNewlyCompleted: boolean;
  message_type: string;
  reward_amount: number;
}

export interface ProgressState {
  questsWithChanges: QuestProgress[];
  creditsGained: number;
  hasAnimation: boolean;
  levelUp: boolean;
}

const STORAGE_KEY = 'quest_progress_ui';

export function useQuestProgress() {
  const [progressState, setProgressState] = useState<ProgressState>({
    questsWithChanges: [],
    creditsGained: 0,
    hasAnimation: false,
    levelUp: false
  });


  useEffect(() => {
    const savedProgress = localStorage.getItem(STORAGE_KEY);
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setProgressState(parsed);
      } catch (err) {
        console.error('Error parsing quest progress from localStorage:', err);
      }
    }
  }, []);


  const updateQuestProgress = useCallback((messageType: string, incrementAmount: number) => {
    // First check if we have quests in localStorage
    const savedQuests = localStorage.getItem('quests_data');
    if (!savedQuests) return;

    try {
      const questsData = JSON.parse(savedQuests);
      const targetQuest = questsData.find((q: any) => q.message_type === messageType);
      
      if (!targetQuest) return;
      
      // Calculate new progress
      const previousProgress = targetQuest.current_progress;
      let newProgress = Math.min(previousProgress + incrementAmount, targetQuest.required_progress);
      const wasCompleted = targetQuest.isCompleted;
      const isNowCompleted = newProgress >= targetQuest.required_progress;
      
  
      if (wasCompleted) return;
      
      // Update the quest in localStorage
      targetQuest.current_progress = newProgress;
      targetQuest.progress_percentage = Math.floor((newProgress / targetQuest.required_progress) * 100);
      
      if (isNowCompleted && !wasCompleted) {
        targetQuest.isCompleted = true;
        targetQuest.completed_at = new Date().toISOString();
        
 
        toast.success(`Quest completed: ${targetQuest.title}`, {
          icon: '🎯',
          duration: 3000
        });
      }
  
      localStorage.setItem('quests_data', JSON.stringify(questsData));
      
      // Update animation state in localStorage directly
      const currentProgressState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"questsWithChanges":[],"creditsGained":0,"hasAnimation":false,"levelUp":false}');
      
      const updatedProgressState = {
        questsWithChanges: [
          ...currentProgressState.questsWithChanges.filter((q: QuestProgress) => q.id !== targetQuest.id),
          {
            id: targetQuest.id,
            previousProgress,
            currentProgress: newProgress,
            isCompleted: isNowCompleted,
            isNewlyCompleted: isNowCompleted && !wasCompleted,
            message_type: targetQuest.message_type,
            reward_amount: targetQuest.reward_amount
          }
        ],
        creditsGained: currentProgressState.creditsGained + (isNowCompleted && !wasCompleted ? targetQuest.reward_amount : 0),
        hasAnimation: true,
        levelUp: false
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProgressState));
      
      
      setProgressState(updatedProgressState);
      
    } catch (err) {
      console.error('Error updating quest progress:', err);
    }
  }, []);

  const syncQuestsWithServer = useCallback(async (userId: any) => {
    const supabase = getSupabaseClient();
    
    try {
      // Call the reset_quests RPC to reset daily quests
      const { error: resetError } = await supabase.rpc('reset_quests', {
        q_user_id: userId,
        q_message_type: null, 
        q_quest_type: 'DAILY' 
      });
  
      if (resetError) {
        console.error('Error resetting quests:', resetError);
        throw resetError;
      }
  
      // Fetch the latest quests from the server
      const { data, error } = await supabase.rpc('get_user_quests', {
        quest_type_filter: null,
        user_uuid: userId
      });
  
      console.log("Calling get quest API");
      if (error) throw error;
      
      if (data && data.success) {
        // Store new quests in localStorage
        localStorage.setItem('quests_data', JSON.stringify(data.quests));
        
        // Track last sync time for caching purposes
        const now = new Date();
        localStorage.setItem('quests_last_sync_date', format(now, 'yyyy-MM-dd'));
        
        return {
          success: true,
          quests: data.quests
        };
      } else {
        throw new Error(data?.message || 'Failed to fetch quests');
      }
    } catch (err: any) {
      console.error('Error syncing quests:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }, []);
  // Add function to force a sync regardless of date
  const forceSyncQuests = useCallback(async (userId : any) => {
    return syncQuestsWithServer(userId);
  }, [syncQuestsWithServer]);

  // Clear animations after they've been shown
  const clearAnimations = useCallback(() => {
    const clearedState = {
      questsWithChanges: [],
      creditsGained: 0,
      hasAnimation: false,
      levelUp: false
    };
    
    setProgressState(clearedState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clearedState));
  }, []);

  return {
    progressState,
    updateQuestProgress,
    clearAnimations,
    syncQuestsWithServer,
    forceSyncQuests
  };
}