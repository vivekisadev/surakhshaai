import type { Event } from "@/types"
import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Siren, 
  UserX,
  ShieldAlert,
  HeartPulse,
  HandMetal,
  Pill,
  X,
  Shield,
  BedDouble,
  DoorOpen
} from "lucide-react"
import { SecurityAlertModal } from "@/components/security-alert-modal"
import { cn } from "@/lib/utils"

interface EventFeedProps {
  events: Event[]
  videoTimes: Record<string, number>
  onEventHover: (cameraId: string | null) => void
  onEventClick: (cameraId: string, timestamp: number) => void
  highlightCameraId?: string | null
}

interface VisibleEvent extends Event {
  addedAt: number
}

const INCIDENT_TYPES = {
  aggression: { icon: HandMetal, color: "text-red-500", bg: "bg-red-500/10" },
  assault: { icon: Siren, color: "text-red-500", bg: "bg-red-500/10" },
  "staff assault": { icon: Siren, color: "text-red-500", bg: "bg-red-500/10" },
  "mob aggression": { icon: Siren, color: "text-red-500", bg: "bg-red-500/10" },
  negligence: { icon: UserX, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  "duty abandonment": { icon: BedDouble, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  fall: { icon: HeartPulse, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  "patient fall": { icon: HeartPulse, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  unauthorized: { icon: DoorOpen, color: "text-purple-500", bg: "bg-purple-500/10" },
  "zone breach": { icon: ShieldAlert, color: "text-purple-500", bg: "bg-purple-500/10" },
  drug: { icon: Pill, color: "text-blue-500", bg: "bg-blue-500/10" },
} as const

const getIncidentIcon = (type: string) => {
  const normalizedType = type.toLowerCase()
  for (const [key, value] of Object.entries(INCIDENT_TYPES)) {
    if (normalizedType.includes(key)) {
      return value
    }
  }
  return { icon: AlertTriangle, color: "text-gray-500", bg: "bg-gray-500/10" }
}

const formatTimeAgo = (addedAt: number, currentTime: number) => {
  const secondsAgo = Math.floor((currentTime - addedAt) / 1000)
  if (secondsAgo < 60) {
    return `${secondsAgo}s ago`
  }
  const minutesAgo = Math.floor(secondsAgo / 60)
  return `${minutesAgo}m ago`
}

export function EventFeed({ 
  events, 
  videoTimes, 
  onEventHover, 
  onEventClick, 
  highlightCameraId 
}: EventFeedProps) {
  const [visibleEvents, setVisibleEvents] = useState<VisibleEvent[]>([])
  const [lastEventTime, setLastEventTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [selectedEventForAlert, setSelectedEventForAlert] = useState<VisibleEvent | null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const processNewEvents = useCallback((newEvents: Event[]) => {
    const now = Date.now()
    if (newEvents.length === 0) return

    setVisibleEvents(prev => {
      // Add all new events, not just one random one
      const eventsWithTimestamp = newEvents.map(e => ({ ...e, addedAt: now }))
      const combined = [...eventsWithTimestamp, ...prev]
      // Keep only unique IDs
      const unique = Array.from(new Map(combined.map(e => [e.id, e])).values())
      return unique.slice(0, 15) // Show top 15
    })
    setLastEventTime(now)
  }, [])

  useEffect(() => {
    const newEvents = events.filter(event => {
      const videoTime = videoTimes[event.camera.id] || 0
      const eventTimeInSeconds = event.timestamp.getTime() / 1000
      return Math.abs(videoTime - eventTimeInSeconds) < 1
    })
    processNewEvents(newEvents)
  }, [events, videoTimes, processNewEvents])

  const handleDismiss = (eventId: string) => {
    setVisibleEvents(prev => prev.filter(e => e.id !== eventId))
  }

  return (
    <div className="relative flex flex-col space-y-3">
      <h2 className="text-xl font-mono uppercase tracking-widest text-neutral-300 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] border-b border-neutral-800 pb-2">Recent Events</h2>
      <AnimatePresence>
        {visibleEvents.map((event) => {
          const { icon: Icon, color, bg } = getIncidentIcon(event.type)
          const isHighlighted = highlightCameraId === event.camera.id
          const hasAnyHighlight = highlightCameraId !== null && highlightCameraId !== undefined
          
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ 
                opacity: hasAnyHighlight ? (isHighlighted ? 1 : 0.4) : 1, 
                y: 0 
              }}
              exit={{ opacity: 0, x: -100 }}
              className={cn(
                "relative rounded-sm border bg-neutral-900 shadow-none transition-all duration-300",
                isHighlighted ? "border-blue-500 bg-blue-500/5 z-20" : "border-neutral-800 hover:border-neutral-700",
                hasAnyHighlight && !isHighlighted ? "grayscale opacity-50" : ""
              )}
            >
              <div className="p-3">
                <div className="flex items-start gap-3">
                  <div className={cn("p-1.5 rounded-sm border border-neutral-800 bg-black/50 mt-1", color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-mono text-xs text-neutral-200 tracking-wider">[{event.camera.name}]</p>
                    <p className={cn("text-[10px] font-mono uppercase tracking-widest", color)}>{event.type}</p>
                    <p className="text-[10px] text-neutral-500">{event.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-mono text-neutral-500 mt-1">
                    <Clock className="h-3 w-3 opacity-50" />
                    <span>{formatTimeAgo(event.addedAt, currentTime)}</span>
                  </div>
                </div>
                <div className="mt-2 pl-10 flex items-center gap-1.5 text-[9px] font-mono text-neutral-600">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{event.camera.address}</span>
                </div>
                <div className="mt-3 pl-10 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDismiss(event.id)
                    }}
                    className={cn(
                      "relative z-20 flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-[9px] font-mono uppercase tracking-widest",
                      "bg-neutral-800 text-neutral-400",
                      "hover:bg-neutral-700 hover:text-neutral-200",
                      "transition-all duration-200"
                    )}
                  >
                    <X className="h-3 w-3" />
                    Dismiss
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedEventForAlert(event)
                    }}
                    className={cn(
                      "relative z-20 flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-[9px] font-mono uppercase tracking-widest",
                      "bg-red-500/10 text-red-500 border border-red-500/20",
                      "hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400",
                      "transition-all duration-200"
                    )}
                  >
                    <Shield className="h-3 w-3" />
                    Issue Alert
                  </button>
                </div>
              </div>
              <button
                className="absolute inset-0 z-10 cursor-pointer"
                onMouseEnter={() => onEventHover(event.camera.id)}
                onMouseLeave={() => onEventHover(null)}
                onClick={() => onEventClick(event.camera.id, event.timestamp.getTime() / 1000)}
              >
                <span className="sr-only">View camera feed</span>
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>

      <SecurityAlertModal
        open={selectedEventForAlert !== null}
        onOpenChange={(open: boolean) => !open && setSelectedEventForAlert(null)}
        onAlertComplete={() => {
          if (selectedEventForAlert) {
            handleDismiss(selectedEventForAlert.id)
          }
        }}
        eventTitle={selectedEventForAlert?.type ?? "Security Alert"}
        eventDescription={selectedEventForAlert?.description ?? "Suspicious activity detected"}
        eventLocation={selectedEventForAlert?.camera.address ?? "Unknown Location"}
      />
    </div>
  )
}
