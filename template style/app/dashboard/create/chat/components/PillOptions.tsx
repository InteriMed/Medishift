'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';

export interface QuickOption {
  id: string;
  label: string;
  value: string;
  action_type?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  disabled?: boolean;
}

interface PillOptionsProps {
  options: QuickOption[];
  onSelect: (option: QuickOption) => void;
  disabled?: boolean;
}

export function PillOptions({ options, onSelect, disabled = false }: PillOptionsProps) {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  const handleClick = useCallback(
    (option: QuickOption) => {
      if (disabled || option.disabled) return;
      onSelect(option);
    },
    [disabled, onSelect]
  );

  if (!options || options.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {options.map((option, index) => (
        <motion.div
          key={option.id || index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05, duration: 0.2 }}
        >
          <Button
            onClick={() => handleClick(option)}
            disabled={disabled || option.disabled}
            variant={option.variant || 'outline'}
            size="sm"
            className={`h-8 px-4 rounded-full text-sm font-medium transition-all duration-200 ${
              isDarkMode
                ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-200'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700'
            } ${
              option.variant === 'default'
                ? isDarkMode
                  ? 'bg-primary/20 border-primary/30 hover:bg-primary/30 text-primary'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
                : ''
            } ${
              option.disabled || disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            }`}
          >
            {option.label}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

