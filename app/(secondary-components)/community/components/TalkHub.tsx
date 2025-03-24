'use client';

import React, { useState, KeyboardEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Plus, Heart, MessageSquare, Share2, Tag, AtSign, Send, 
  Sparkles, Image, X, Hash 
} from 'lucide-react';
import { createBlog, fetchBlogs, toggleLike, getLikeCount } from '../functions/talk_hub_rpcs';
import { useUser } from '@/app/auth/useUser';

export const TalkHub: React.FC = () => {
  const {user} = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});


  useEffect(() => {
    const getBlogs = async () => {
      try {
        setIsLoading(true);
     
        const userId = user?.id || '';
        const blogsData = await fetchBlogs(userId, 15);
        
        const formattedBlogs = blogsData.map((blog: any) => ({
          id: blog.id,
          author: blog.username || 'Anonymous',
          authorId: blog.user_id,
          avatarUrl: blog.avatar_url,
          title: blog.title,
          content: blog.content,
          timestamp: blog.created_at,
          likes: blog.like_count || 0,
          comments: blog.comment_count || 0,
          shares: 0, 
          tags: blog.tags ? blog.tags.split(',').filter((tag: string) => tag.trim()) : [],
          imageUrl: blog.image_url || '',
          hasLiked: blog.has_liked || false
        }));
        
        setPosts(formattedBlogs);
        
    
        const likeState: Record<string, boolean> = {};
        formattedBlogs.forEach((blog : any) => {
          likeState[blog.id] = blog.hasLiked;
        });
        setLikedPosts(likeState);
        
      } catch (err) {
        console.error('Error fetching blogs:', err);
        setError('Failed to load blogs. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    getBlogs();
  }, [user]); 

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    
 
    if (!newTags.includes(tagInput.trim())) {
      setNewTags([...newTags, tagInput.trim()]);
    }
    
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewTags(newTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handlePost = async () => {
    if (!newPost.trim() || !newTitle.trim()) return;

    if (!user) {
      console.error('User not found');
      return;
    }

    try {
      const tagsString = newTags.join(',');
      const blogId = await createBlog(
        user.id,            
        newTitle.trim(),   
        newPost.trim(),    
        newImageUrl.trim() || "", 
        tagsString         
      );

      if (blogId) {
        const newPostObj = {
          id: blogId,
          author: 'You',
          title: newTitle.trim(),
          content: newPost.trim(),
          timestamp: new Date().toISOString(),
          likes: 0,
          comments: 0,
          shares: 0,
          tags: newTags,
          imageUrl: newImageUrl.trim(),
          hasLiked: false
        };
        
        setPosts([newPostObj, ...posts]);

        // Refresh the blogs list after posting
        try {
          // Pass the user ID to fetchBlogs
          const userId = user?.id || '';
          const blogsData = await fetchBlogs(userId, 20);
          
          const formattedBlogs = blogsData.map((blog: any) => ({
            id: blog.id,
            author: blog.username || 'Anonymous',
            authorId: blog.user_id,
            avatarUrl: blog.avatar_url,
            title: blog.title,
            content: blog.content,
            timestamp: blog.created_at,
            likes: blog.like_count || 0,
            comments: blog.comment_count || 0, 
            shares: 0,
            tags: blog.tags ? blog.tags.split(',').filter((tag: string) => tag.trim()) : [],
            imageUrl: blog.image_url || '',
            hasLiked: blog.has_liked || false
          }));
          
          setPosts(formattedBlogs);
          
      
          const likeState: Record<string, boolean> = {};
          formattedBlogs.forEach(blog => {
            likeState[blog.id] = blog.hasLiked;
          });
          setLikedPosts(likeState);
        } catch (err) {
          console.error('Error refreshing blogs:', err);
        }
      }
    } catch (error) {
      console.error("Error creating blog:", error);
    }
    
    // Reset form
    setNewPost('');
    setNewTitle('');
    setNewTags([]);
    setNewImageUrl('');
    setIsDialogOpen(false);
  };

  // Handle like button click
  const handleLikeToggle = async (postId: string) => {
    if (!user) {
      // Optional: Show a message prompting the user to log in
      console.error('User must be logged in to like posts');
      return;
    }

    try {
      // Toggle like in the database
      const isLiked = await toggleLike(user.id, postId, 'blog');
      
      // Update local state to reflect the change
      setLikedPosts(prev => ({
        ...prev,
        [postId]: isLiked
      }));

      // Update the post's like count in the UI
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              likes: isLiked ? post.likes + 1 : Math.max(0, post.likes - 1)
            };
          }
          return post;
        })
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <div className="h-[calc(100vh-10rem)] overflow-hidden">
      <div className="h-full overflow-y-auto no-scrollbar">
        <div className="space-y-3 p-3">
          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {/* Error State */}
          {error && (
            <div className="p-4 text-center text-red-400 bg-red-500/10 rounded-md border border-red-500/20">
              {error}
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="mt-2 border-red-500/30 text-red-400 hover:bg-red-500/20"
              >
                Try Again
              </Button>
            </div>
          )}
          
          {/* Empty State */}
          {!isLoading && !error && posts.length === 0 && (
            <div className="text-center p-8 text-gray-400">
              <p className="mb-2">No conversations started yet.</p>
              <p>Be the first to share something with the community!</p>
            </div>
          )}
          
          {/* Posts List */}
          <AnimatePresence mode="wait">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  mass: 0.8,
                  delay: index * 0.15
                }}
                viewport={{ once: true }}
                className="block"
              >
                <Card className="relative group overflow-hidden backdrop-blur-xl border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
                  <div className="relative p-4 space-y-3">
                    {/* Author Info */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-[1.5px]">
                        {post.avatarUrl ? (
                          <img 
                            src={post.avatarUrl} 
                            alt={post.author}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white text-sm font-bold">
                            {post.author[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{post.author}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(post.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Title if available */}
                    {post.title && (
                      <h3 className="text-white font-medium text-base">{post.title}</h3>
                    )}

                    {/* Content */}
                    <p className="text-gray-200 text-sm">{post.content}</p>

                    {/* Image if available */}
                    {post.imageUrl && (
                      <div className="rounded-md overflow-hidden">
                        <img 
                          src={post.imageUrl} 
                          alt={post.title || "Post image"} 
                          className="w-full object-cover max-h-80"
                        />
                      </div>
                    )}

                    {/* Tags */}
                    {post.tags.length > 0 && (
                      <motion.div 
                        className="flex flex-wrap gap-1.5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        {post.tags.map((tag) => (
                          <Badge 
                            key={tag} 
                            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20 text-xs px-2 py-0.5"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </motion.div>
                    )}

                    {/* Interaction Buttons */}
                    <div className="flex gap-4 pt-1">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`flex items-center gap-1.5 transition-colors text-xs ${
                          likedPosts[post.id] 
                            ? 'text-blue-400' 
                            : 'text-gray-400 hover:text-blue-400'
                        }`}
                        onClick={() => handleLikeToggle(post.id)}
                      >
                        <Heart 
                          className={`w-3.5 h-3.5 ${likedPosts[post.id] ? 'fill-blue-400' : ''}`} 
                        />
                        <span>{post.likes}</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="flex items-center gap-1.5 text-gray-400 hover:text-purple-400 transition-colors text-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{post.comments}</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="flex items-center gap-1.5 text-gray-400 hover:text-green-400 transition-colors text-xs"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{post.shares}</span>
                      </motion.button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Action Button */}
      <motion.div 
        className="fixed bottom-6 right-6 z-50"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur group-hover:blur-xl transition-all duration-300" />
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="relative bg-black hover:bg-gray-900 text-white border border-blue-500/50 shadow-lg shadow-blue-500/20 rounded-full h-10 px-4 text-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span className="mr-1.5">Start Conversation</span>
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          </Button>
        </div>
      </motion.div>

      {/* Enhanced New Post Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-black/90 border border-blue-500/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Start a Conversation
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-3">
            {/* Title Input */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Title</label>
              <Input
                placeholder="Add a title for your post..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-gray-900/50 border border-blue-500/20 focus:border-blue-500/50 text-white placeholder:text-gray-400 text-sm"
              />
            </div>
            
            {/* Content Input */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Content</label>
              <Textarea
                placeholder="Share your thoughts with the community..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="min-h-[80px] bg-gray-900/50 border border-blue-500/20 focus:border-blue-500/50 text-white placeholder:text-gray-400 text-sm"
              />
            </div>
            
            {/* Image URL Input */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Image URL (optional)</label>
              <Input
                placeholder="Add an image URL..."
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="bg-gray-900/50 border border-blue-500/20 focus:border-blue-500/50 text-white placeholder:text-gray-400 text-sm"
              />
            </div>
            
            {/* Tags Input */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Tags</label>
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Add tags..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="bg-gray-900/50 border border-blue-500/20 focus:border-blue-500/50 text-white placeholder:text-gray-400 text-sm"
                />
               
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleAddTag}
                  className="bg-blue-500 hover:bg-blue-600 text-white h-9 px-3"
                >
                  <Hash className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Tag Display */}
              {newTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {newTags.map((tag) => (
                    <Badge 
                      key={tag} 
                      className="bg-blue-500/20 text-blue-400 border-blue-500/20 text-xs px-2 py-1 flex items-center gap-1"
                    >
                      #{tag}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-white" 
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <motion.div 
              className="w-full" 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                onClick={handlePost} 
                className="w-full h-9 text-sm bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                disabled={!newTitle.trim() || !newPost.trim()}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Post
              </Button>
            </motion.div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};