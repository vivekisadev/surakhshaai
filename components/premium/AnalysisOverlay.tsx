import { motion, AnimatePresence } from "framer-motion"

interface AnalysisOverlayProps {
  isActive: boolean;
}

export const AnalysisOverlay = ({ isActive }: AnalysisOverlayProps) => (
  <AnimatePresence>
    {isActive && (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
      >
        <div className="absolute inset-0 grid grid-cols-12 grid-rows-8 opacity-30">
          {[...Array(96)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ 
                opacity: [0, 0.4, 0],
                backgroundColor: i % 4 === 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0,0,0,0.4)'
              }}
              transition={{
                duration: Math.random() * 1.2 + 0.4,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
              className="border-[0.5px] border-white/5"
            />
          ))}
        </div>
        <div className="absolute inset-0 noise-bg opacity-[0.06] animate-glitch-pixel" />
      </motion.div>
    )}
  </AnimatePresence>
);
