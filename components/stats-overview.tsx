import { Camera, Server, Wifi } from "lucide-react"
import { getSystemStats } from "@/lib/data"

export function StatsOverview() {
  const stats = getSystemStats();
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1 border-l-2 border-blue-500 pl-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
          <Camera className="h-3 w-3" />
          <span>Nodes</span>
        </div>
        <p className="text-xl font-mono font-semibold text-neutral-200">
          {stats.totalCameras}
        </p>
      </div>
      
      <div className="space-y-1 border-l-2 border-emerald-500 pl-3">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
          <Wifi className="h-3 w-3" />
          <span>Online</span>
        </div>
        <p className="text-xl font-mono font-semibold text-neutral-200">
          {stats.onlineCameras}
        </p>
      </div>
    </div>
  )
}
