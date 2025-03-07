'use client';

import React, { useState, KeyboardEvent } from 'react';
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
import { Plus, Heart, MessageSquare, Share2, Tag, AtSign, Send, Sparkles } from 'lucide-react';

export const TalkHub: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [posts, setPosts] = useState([
    {
      id: 1,
      author: 'John Doe',
      content: 'Just started exploring the amazing world of Web3! Anyone else excited about the future of decentralized applications?',
      timestamp: new Date().toISOString(),
      likes: 24,
      comments: [1, 2, 3],
      shares: 5,
      tags: ['Web3', 'Blockchain', 'Future']
    },
  ]);

  const handlePost = () => {
    if (!newPost.trim()) return;

    // Create new post
    const newPostObj = {
      id: posts.length + 1,
      author: 'You',
      content: newPost.trim(),
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: [],
      shares: 0,
      tags: []
    };

    // Add new post to the beginning of the array
    setPosts([newPostObj, ...posts]);
    
    // Reset form
    setNewPost('');
    setIsDialogOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent new line
      handlePost();
    }
  };

  return (
    <div className="h-[calc(100vh-10rem)] overflow-hidden">
      <div className="h-full overflow-y-auto no-scrollbar">
        <div className="space-y-3 p-3">
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
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white text-sm font-bold">
                          {post.author[0]}
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{post.author}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(post.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Content */}
                    <p className="text-gray-200 text-sm">{post.content}</p>

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
                        className="flex items-center gap-1.5 text-gray-400 hover:text-blue-400 transition-colors text-xs"
                      >
                        <Heart className="w-3.5 h-3.5" />
                        <span>{post.likes}</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="flex items-center gap-1.5 text-gray-400 hover:text-purple-400 transition-colors text-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{post.comments.length}</span>
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

      {/* New Post Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-black/90 border border-blue-500/20 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Start a Conversation
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-3 py-3">
            <Textarea
              placeholder="Share your thoughts with the community..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] bg-gray-900/50 border border-blue-500/20 focus:border-blue-500/50 text-white placeholder:text-gray-400 text-sm"
            />
            <div className="flex gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="sm" className="h-8 text-xs border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/10">
                  <Tag className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                  Add Tags
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" size="sm" className="h-8 text-xs border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/10">
                  <AtSign className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
                  Mention
                </Button>
              </motion.div>
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
