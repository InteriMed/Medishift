'use client';

import { motion } from 'framer-motion';
import { ClipizyLogo } from '@/components/common/clipizy-logo';

interface LoadingIndicatorProps {
  message?: string;
}

export function LoadingIndicator({ message = 'Thinking...' }: LoadingIndicatorProps) {
  return (
    <div className="flex gap-3 justify-start items-center py-2">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <ClipizyLogo className="w-5 h-5" />
      </div>
        <motion.span
        className="text-sm inline-block"
        style={{
          background: 'linear-gradient(90deg, rgb(156 163 175) 0%, rgb(156 163 175) 40%, rgb(255 255 255) 50%, rgb(156 163 175) 60%, rgb(156 163 175) 100%)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
        animate={{
          backgroundPosition: ['-100% 0%', '100% 0%'],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'linear',
          repeatDelay: 0.5,
        }}
        >
        {message}
        </motion.span>
    </div>
  );
}
