'use client';

import { useUser } from '@/app/auth/useUser';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-[#40A6FF] to-[#2D63FF] text-transparent bg-clip-text mb-8">
        Profile
      </h1>

      <div className="space-y-8">
        {/* Basic Info */}
        <Card className="p-6 bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-xl border-white/5">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#40A6FF] to-[#2D63FF] flex items-center justify-center text-2xl font-bold text-white">
              {user.user_metadata?.full_name?.[0] || user.email?.[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{user.user_metadata?.full_name || 'Anonymous'}</h2>
              <p className="text-gray-400">Member since {new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Email</label>
              <p className="text-white font-medium">{user.email}</p>
            </div>
            
            <div>
              <label className="text-sm text-gray-400">User ID</label>
              <div className="flex items-center space-x-2">
                <code className="text-white bg-white/5 px-2 py-1 rounded">{user.id}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(user.id)}
                  className="hover:bg-white/5"
                >
                  <Copy className="h-4 w-4 text-gray-400" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-xl border-white/5">
            <h3 className="text-lg font-medium text-gray-400 mb-2">Current Plan</h3>
            <p className="text-2xl font-bold text-white">Free</p>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-xl border-white/5">
            <h3 className="text-lg font-medium text-gray-400 mb-2">Available Credits</h3>
            <p className="text-2xl font-bold text-white">...</p>
          </Card>
          
          <Card className="p-6 bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-xl border-white/5">
            <h3 className="text-lg font-medium text-gray-400 mb-2">Active GPUs</h3>
            <p className="text-2xl font-bold text-white">0</p>
          </Card>
        </div>

        {/* Activity */}
        <Card className="p-6 bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-xl border-white/5">
          <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
          <div className="text-gray-400 text-center py-8">
            No recent activity
          </div>
        </Card>
      </div>
    </div>
  );
}
