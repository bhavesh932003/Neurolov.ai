import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageSquare, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createComment, toggleLike } from '../functions/talk_hub_rpcs';
import { formatDistanceToNow } from 'date-fns';

interface CommentProps {
    comment: {
        id: string;
        content: string;
        created_at: string;
        username: string;
        avatar_url?: string;
        user_id: string;
        like_count: number;
        reply_count: number;
        has_liked: boolean;
        replies: any[];
    };
    blogId: string;
    currentUserId?: string;
    onNewComment: () => void;
    level?: number;
}

const Comment: React.FC<CommentProps> = ({
    comment,
    blogId,
    currentUserId,
    onNewComment,
    level = 0
}) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [showReplies, setShowReplies] = useState(level < 2); // Auto-expand first two levels
    const [liked, setLiked] = useState(comment.has_liked);
    const [likeCount, setLikeCount] = useState(comment.like_count);

    console.log("date", new Date(comment.created_at))

    // Dynamic time formatting function
    const formatTimestamp = (timestamp: string) => {
        // Parse the timestamp (assuming it's in a standard format like ISO 8601)
        const date = new Date(timestamp);

        console.log(formatDistanceToNow(date, {
            addSuffix: true,
            // Optionally, you can add locale if needed
            // locale: enUS 
        }))
        // Use formatDistanceToNow with additional options
        return formatDistanceToNow(date, {
            addSuffix: true,
            // Optionally, you can add locale if needed
            // locale: enUS 
        });
    };



    const handleReplySubmit = async () => {
        if (!replyContent.trim() || !currentUserId) return;

        try {
            const commentId = await createComment(
                currentUserId,
                blogId,
                replyContent,
                comment.id
            );

            if (commentId) {
                setReplyContent('');
                setIsReplying(false);
                onNewComment(); // Trigger refresh of comments
            }
        } catch (error) {
            console.error('Error creating reply:', error);
        }
    };

    const handleLikeToggle = async () => {
        if (!currentUserId) return;

        try {
            const isLiked = await toggleLike(currentUserId, comment.id, 'comment');
            setLiked(isLiked);
            setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
        } catch (error) {
            console.error('Error toggling like for comment:', error);
        }
    };

    return (
        <motion.div
            className="comment-container"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
        >
            <div className={`${level > 0 ? 'pl-3 ml-2 border-l' : ''} border-blue-500/20`}>
                <div className="py-1.5">
                    {/* Comment header */}
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-[1px]">
                            {comment.avatar_url ? (
                                <img
                                    src={comment.avatar_url}
                                    alt={comment.username}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white text-xs font-bold">
                                    {comment.username[0]}
                                </div>
                            )}
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="font-medium text-sm text-white">{comment.username}</span>
                            <span className="text-xs text-gray-400">
                                {formatTimestamp(comment.created_at)}
                            </span>
                        </div>
                    </div>

                    {/* Comment content */}
                    <p className="text-sm text-gray-200 ml-8 mb-1">{comment.content}</p>

                    {/* Comment actions */}
                    <div className="flex items-center gap-3 ml-8">
                        <button
                            className={`flex items-center gap-1 text-xs ${liked ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400'}`}
                            onClick={handleLikeToggle}
                        >
                            <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-blue-400' : ''}`} />
                            <span>{likeCount}</span>
                        </button>

                        <button
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-400"
                            onClick={() => setIsReplying(!isReplying)}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Reply</span>
                        </button>

                        {comment.replies?.length > 0 && (
                            <button
                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-400"
                                onClick={() => setShowReplies(!showReplies)}
                            >
                                {showReplies ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                )}
                                <span>{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
                            </button>
                        )}
                    </div>

                    {/* Reply form - more compact */}
                    {isReplying && (
                        <div className="mt-2 ml-8">
                            <div className="flex items-center gap-2">
                                <Textarea
                                    placeholder="Write a reply..."
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    className="min-h-[40px] bg-gray-900/50 border border-blue-500/20 focus:border-blue-500/50 text-white text-xs resize-none py-1.5 px-2"
                                />
                                <Button
                                    size="sm"
                                    onClick={handleReplySubmit}
                                    disabled={!replyContent.trim() || !currentUserId}
                                    className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 rounded-full"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Nested replies */}
                    {showReplies && comment.replies?.length > 0 && (
                        <div className="mt-1">
                            {comment.replies.map((reply) => (
                                <Comment
                                    key={reply.id}
                                    comment={reply}
                                    blogId={blogId}
                                    currentUserId={currentUserId}
                                    onNewComment={onNewComment}
                                    level={level + 1}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default Comment; 