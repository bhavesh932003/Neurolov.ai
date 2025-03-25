import React, { useState, useEffect } from 'react';
import { fetchComments, createComment } from '../functions/talk_hub_rpcs';
import Comment from './Comment';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface CommentsSectionProps {
  blogId: string;
  userId?: string;
  isOpen: boolean;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ 
  blogId, 
  userId,
  isOpen
}) => {
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    
    const loadComments = async () => {
      setIsLoading(true);
      try {
        const commentsData = await fetchComments(blogId, userId);
        setComments(commentsData);
      } catch (error) {
        console.error('Error loading comments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadComments();
  }, [blogId, userId, refreshTrigger, isOpen]);

  const handleCommentSubmit = async () => {
    if (!newComment.trim() || !userId) return;
    
    try {
      const commentId = await createComment(userId, blogId, newComment);
      if (commentId) {
        setNewComment('');
        // Refresh comments
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      className="comments-section p-3 bg-black/50 border-t border-blue-500/20 mt-1 rounded-b-md"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-white font-medium flex items-center gap-2 mb-3 text-sm">
        <MessageSquare className="w-4 h-4 text-blue-400" />
        Comments
      </h3>
      
      {/* New comment form - more compact */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[50px] bg-gray-900/50 border border-blue-500/20 focus:border-blue-500/50 text-white text-sm resize-none py-2"
          />
          <Button 
            onClick={handleCommentSubmit}
            disabled={!newComment.trim() || !userId}
            className="h-10 w-10 p-0 bg-blue-500 hover:bg-blue-600 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Comments list */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map(comment => (
            <Comment 
              key={comment.id} 
              comment={comment} 
              blogId={blogId}
              currentUserId={userId}
              onNewComment={() => setRefreshTrigger(prev => prev + 1)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-400">
          <p className="text-sm">No comments yet.</p>
          <p className="text-xs mt-1">Be the first to share your thoughts!</p>
        </div>
      )}
    </motion.div>
  );
};

export default CommentsSection; 