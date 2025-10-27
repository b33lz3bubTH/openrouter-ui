import React from 'react';
import { BotMedia } from '@/types/chat';

interface BotAvatarProps {
  botName: string;
  profilePicture?: BotMedia;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BotAvatar: React.FC<BotAvatarProps> = ({
  botName,
  profilePicture,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg'
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (profilePicture) {
    return (
      <div className={`${sizeClasses[size]} rounded-lg overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-sm ${className}`}>
        <img
          src={profilePicture.blobRef}
          alt={`${botName} avatar`}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-sm text-white font-medium ${className}`}>
      {getInitials(botName)}
    </div>
  );
};

export default BotAvatar;
