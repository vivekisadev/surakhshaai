import { Camera, Wifi, Shield, Clock } from "lucide-react"
import { getSystemStats } from "@/lib/data"

export function StatsOverview() {
  const stats = getSystemStats()

  const items = [
    { label: "Total Cameras", value: stats.totalCameras, icon: Camera,  color: "border-blue-500   text-blue-400"    },
    { label: "Online",        value: stats.onlineCameras, icon: Wifi,    color: "border-emerald-500 text-emerald-400" },
    { label: "Coverage",      value: "100%",              icon: Shield,  color: "border-purple-500  text-purple-400"  },
    { label: "Response",      value: "< 3s",              icon: Clock,   color: "border-yellow-500  text-yellow-400"  },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(item => (
        <div key={item.label} className={`border-l-2 pl-3 space-y-0.5 ${item.color.split(" ")[0]}`}>
          <div className={`flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest ${item.color.split(" ")[1]} opacity-70`}>
            <item.icon className="w-2.5 h-2.5" />
            {item.label}
          </div>
          <p className="text-lg font-mono font-bold text-neutral-200 leading-none">{item.value}</p>
        </div>
      ))}
    </div>
  )
}
