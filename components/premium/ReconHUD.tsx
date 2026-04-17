import { motion, AnimatePresence } from "framer-motion"
import { Activity } from "lucide-react"

interface ReconHUDProps {
  isRecording: boolean;
}

export const ReconHUD = ({ isRecording }: ReconHUDProps) => (
  <AnimatePresence>
    {isRecording && (
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="absolute top-8 left-8 flex items-center gap-4 z-20"
      >
        <div className="glass rounded-lg px-4 py-2 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Recon</span>
        </div>
        <div className="glass rounded-lg px-4 py-2 text-[10px] font-mono font-bold tracking-tighter text-white/70">
          LOAD: OPTIMAL
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);
