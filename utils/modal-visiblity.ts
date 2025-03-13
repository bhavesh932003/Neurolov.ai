export interface ModalStorageItem {
    timestamp: number;
    expiryDays?: number;
  }
  
  export const ModalVisibilityManager = {
    // Generate a unique storage key
    generateStorageKey: (pageName: string) => `welcome-modal-${pageName}`,
  
    // Check if modal has been seen
    hasSeenModal: (pageName: string, expiryDays: number = 30): boolean => {
      if (typeof window !== 'undefined') {
        const key = ModalVisibilityManager.generateStorageKey(pageName);
        const storedItem = localStorage.getItem(key);
        
        if (!storedItem) return false;
  
        try {
          const parsedItem: ModalStorageItem = JSON.parse(storedItem);
          const currentTime = new Date().getTime();
          const timeDiff = currentTime - parsedItem.timestamp;
          const expiryTime = (parsedItem.expiryDays || expiryDays) * 24 * 60 * 60 * 1000;
          
          return timeDiff < expiryTime;
        } catch {
          return false;
        }
      }
      return false;
    },
  
    // Mark modal as seen
    markModalAsSeen: (pageName: string, expiryDays: number = 30) => {
      if (typeof window !== 'undefined') {
        const key = ModalVisibilityManager.generateStorageKey(pageName);
        const item: ModalStorageItem = {
          timestamp: new Date().getTime(),
          expiryDays
        };
        localStorage.setItem(key, JSON.stringify(item));
      }
    },
  
    // Reset modal visibility
    resetModalVisibility: (pageName: string) => {
      if (typeof window !== 'undefined') {
        const key = ModalVisibilityManager.generateStorageKey(pageName);
        localStorage.removeItem(key);
      }
    }
  };