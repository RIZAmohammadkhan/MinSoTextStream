import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { useLocation } from "wouter";

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 0.98
  }
};

const pageTransition = {
  type: "tween",
  ease: [0.25, 0.46, 0.45, 0.94], // Custom easing for smooth feel
  duration: 0.45
};

const containerVariants = {
  initial: { opacity: 0 },
  in: { opacity: 1 },
  out: { opacity: 0 }
};

export default function PageTransition({ children }: PageTransitionProps) {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location}
        initial="initial"
        animate="in"
        exit="out"
        variants={containerVariants}
        transition={{ duration: 0.15 }}
        className="w-full"
      >
        <motion.div
          variants={pageVariants}
          transition={pageTransition}
          className="w-full"
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Individual page wrapper component for more granular control
export function PageWrapper({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        type: "tween",
        ease: [0.25, 0.46, 0.45, 0.94],
        duration: 0.45
      }}
      className={`w-full ${className}`}
    >
      {children}
    </motion.div>
  );
}

// Staggered animation for lists and cards
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

export const staggerItem = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: "tween",
      ease: [0.25, 0.46, 0.45, 0.94],
      duration: 0.5
    }
  }
};

// Smooth navigation button animation
export function NavButton({ 
  children, 
  onClick, 
  isActive, 
  className = "" 
}: { 
  children: ReactNode; 
  onClick: () => void; 
  isActive: boolean; 
  className?: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={className}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <motion.div
        animate={{
          scale: isActive ? 1.1 : 1,
          color: isActive ? "#E8D5B7" : "#B5A894"
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </motion.button>
  );
}
