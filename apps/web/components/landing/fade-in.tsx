'use client';

import { motion } from 'framer-motion';

interface Props {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** Direction: 'up' (default), 'down', 'left', 'right', 'none' */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

/**
 * FadeIn — universal entrance animation.
 * Plays once on mount. Use for hero elements, modals, page transitions.
 * For scroll-triggered, use ScrollReveal instead.
 */
export function FadeIn({ children, className, delay = 0, direction = 'up' }: Props) {
  const offsets = {
    up: { y: 16 },
    down: { y: -16 },
    left: { x: 16 },
    right: { x: -16 },
    none: {},
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...offsets[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
