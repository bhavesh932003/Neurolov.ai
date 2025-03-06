"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import styles from "./styles.module.css"
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Bell,
  Shield,
  Wallet,
  Gift,
  Settings,
  Star,
  Trophy,
  Zap,
  Crown,
} from 'lucide-react';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [rewards, setRewards] = useState(0);
  const [level, setLevel] = useState(1);

  return (
    <div className={`container mx-auto p-6 space-y-6  ${styles.settings} `}>
      {/* Profile Section */}
      <Card className={`p-6 bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20 `}>
        <div className={`flex items-center space-x-4 `}>
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <span className="text-2xl text-white">?</span>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-yellow-500 rounded-full p-2">
              <Crown className="w-4 h-4 text-black" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold">User</h2>
            <p className="text-gray-400">Level {level} Explorer</p>
            <div className="mt-2 flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-yellow-500">{rewards} Compute Points</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Rewards Section */}
      <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center">
            <Gift className="w-5 h-5 mr-2 text-purple-500" />
            Rewards & Achievements
          </h3>
          <Button variant="outline" className="bg-blue-500/10">
            Claim Rewards
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Star, title: 'Early Adopter', points: 500 },
            { icon: Zap, title: 'Power User', points: 1000 },
            { icon: Trophy, title: 'GPU Champion', points: 2000 },
          ].map((reward, index) => (
            <div
              key={index}
              className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20"
            >
              <reward.icon className="w-8 h-8 text-blue-500 mb-2" />
              <h4 className="font-semibold">{reward.title}</h4>
              <p className="text-sm text-gray-400">{reward.points} points</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Notifications */}
        <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20">
          <h3 className="text-lg font-semibold flex items-center mb-4">
            <Bell className="w-5 h-5 mr-2 text-blue-500" />
            Notifications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm">Push Notifications</label>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Email Updates</label>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20">
          <h3 className="text-lg font-semibold flex items-center mb-4">
            <Shield className="w-5 h-5 mr-2 text-green-500" />
            Security
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm">Two-Factor Authentication</label>
              <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
            </div>
            <Button variant="outline" className="w-full bg-blue-500/10">
              Change Password
            </Button>
          </div>
        </Card>

        {/* Wallet */}
        <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20">
          <h3 className="text-lg font-semibold flex items-center mb-4">
            <Wallet className="w-5 h-5 mr-2 text-yellow-500" />
            Wallet
          </h3>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Connect your wallet"
              className="bg-gray-800/50"
            />
            <Button variant="outline" className="w-full bg-blue-500/10">
              Connect Wallet
            </Button>
          </div>
        </Card>

        {/* Preferences */}
        <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 border-blue-500/20">
          <h3 className="text-lg font-semibold flex items-center mb-4">
            <Settings className="w-5 h-5 mr-2 text-purple-500" />
            Preferences
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm">Dark Mode</label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Compact View</label>
              <Switch />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
