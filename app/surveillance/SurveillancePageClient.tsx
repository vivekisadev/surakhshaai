"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { fetchAllVideosFromSupabase, type VideoMeta } from "@/lib/supabaseStorage"
import {
  Camera, Shield, Activity, Monitor, X, ChevronDown, ChevronUp,
  Eye, EyeOff, AlertTriangle, CheckCircle2, Zap, LayoutGrid,
  Filter, RefreshCw, HeartPulse, Flame, Lock, Users
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { locations, events, analyzedEvents } from "@/lib/data"
import { CameraFeed } from "@/components/camera-feed"
import { EventFeed } from "@/components/event-feed"
import { StatsOverview } from "@/components/stats-overview"
import { CameraModal } from "@/components/camera-modal"

// ─── Plugin Manager Component ───────────────────────────────────────────────
function PluginManager() {
  const [plugins, setPlugins] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  const fetchPlugins = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      const res = await fetch("http://localhost:8000/plugins", { signal: controller.signal })
      clearTimeout(timeoutId)
      
      if (!res.ok) throw new Error("Server response not ok")
      const data = await res.json()
      setPlugins(data)
      setLoading(false)
    } catch (e) {
      console.warn("Backend server not reachable — plugin manager idle", e)
      // Don't set loading to false yet, keep trying silently
    }
  }

  useEffect(() => {
    fetchPlugins()
    const interval = setInterval(fetchPlugins, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [])

  const togglePlugin = async (name: string, current: boolean) => {
    try {
      setPlugins(prev => ({ ...prev, [name]: !current }))
      await fetch(`http://localhost:8000/toggle_plugin/${name}/${!current}`)
    } catch (e) {
      console.error("Failed to toggle plugin", e)
    }
  }

  if (loading) return null

  return (
    <div className="flex flex-wrap gap-2 py-3 px-4 bg-neutral-900/50 border-y border-neutral-800/50">
      <div className="flex items-center gap-2 mr-4">
        <Zap className="w-3.5 h-3.5 text-yellow-400 font-bold" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">AI Modules</span>
      </div>
      {Object.entries(plugins).map(([name, enabled]) => (
        <button
          key={name}
          onClick={() => togglePlugin(name, enabled)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border font-mono text-[9px] uppercase tracking-wider transition-all duration-200 ${
            enabled 
              ? "bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]" 
              : "bg-neutral-800/30 border-neutral-800 text-neutral-600 hover:border-neutral-700 hover:text-neutral-400"
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-blue-400 animate-pulse" : "bg-neutral-700"}`} />
          {name}
        </button>
      ))}
    </div>
  )
}

// ─── Types ───────────────────────────────────────────────────────────────────
const INCIDENT_COLORS: Record<string, { dot: string; badge: string; label: string }> = {
  aggression: { dot: "bg-red-500", badge: "border-red-500/30 bg-red-500/10 text-red-400", label: "Aggression" },
  assault: { dot: "bg-red-500", badge: "border-red-500/30 bg-red-500/10 text-red-400", label: "Assault" },
  negligence: { dot: "bg-yellow-500", badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400", label: "Negligence" },
  abandonment: { dot: "bg-yellow-500", badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400", label: "Negligence" },
  fall: { dot: "bg-emerald-500", badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", label: "Fall" },
  unauthorized: { dot: "bg-purple-500", badge: "border-purple-500/30 bg-purple-500/10 text-purple-400", label: "Unauth." },
  drug: { dot: "bg-blue-500", badge: "border-blue-500/30 bg-blue-500/10 text-blue-400", label: "Drug" },
  fire: { dot: "bg-orange-500", badge: "border-orange-500/30 bg-orange-500/10 text-orange-400", label: "Fire" },
  harassment: { dot: "bg-pink-500", badge: "border-pink-500/30 bg-pink-500/10 text-pink-400", label: "Harassment" },
}

function getIncidentStyle(crimeTypes: string[]) {
  const raw = (crimeTypes[0] ?? "").toLowerCase()
  for (const [key, val] of Object.entries(INCIDENT_COLORS)) {
    if (raw.includes(key)) return val
  }
  return { dot: "bg-neutral-500", badge: "border-neutral-500/30 bg-neutral-500/10 text-neutral-400", label: crimeTypes[0] ?? "Alert" }
}

// ─── All cameras flat list ────────────────────────────────────────────────────
const allCameras = locations.flatMap(loc => loc.cameras.map(cam => ({ ...cam, department: loc.name, deptId: loc.id })))
const totalCams = allCameras.length

export default function SurveillancePageClient() {
  const searchParams = useSearchParams()
  const ids = searchParams.get("ids")?.split(",") || []

  // Camera selection (all active by default)
  const [activeCameraIds, setActiveCameraIds] = useState<Set<string>>(() => new Set(allCameras.map(c => c.id)))
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(locations.map(l => l.id)))
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [archiveSelectorOpen, setArchiveSelectorOpen] = useState(false)

  const [selectedArchiveVideos, setSelectedArchiveVideos] = useState<VideoMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null)
  
  // Track source for each camera: { cameraId: { mode: 'live' | 'archive', video?: VideoMeta } }
  const [cameraSources, setCameraSources] = useState<Record<string, { mode: "live" | "archive", video?: VideoMeta }>>({})
  const [videoTimes, setVideoTimes] = useState<Record<string, number>>({})
  const [hoveredCamera, setHoveredCamera] = useState<string | null>(null)
  const [allArchiveVideos, setAllArchiveVideos] = useState<VideoMeta[]>([])

  // Batch video time updates (performance fix)
  const pendingTimesRef = useRef<Record<string, number>>({})
  useEffect(() => {
    const t = setInterval(() => {
      if (Object.keys(pendingTimesRef.current).length > 0) {
        setVideoTimes(prev => ({ ...prev, ...pendingTimesRef.current }))
        pendingTimesRef.current = {}
      }
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Load archive videos
  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const all = await fetchAllVideosFromSupabase()
      setAllArchiveVideos(all)
      if (ids.length > 0) setSelectedArchiveVideos(all.filter(v => ids.includes(v.id)))
      setIsLoading(false)
    }
    load()
  }, [searchParams])

  const handleTimeUpdate = useCallback((cameraId: string, time: number) => {
    pendingTimesRef.current[cameraId] = time
  }, [])

  const handleEventClick = (cameraId: string, timestamp: number) => {
    setSelectedCamera(cameraId)
    setVideoTimes(prev => ({ ...prev, [cameraId]: timestamp }))
  }

  // Camera toggles
  const toggleCamera = (id: string) => {
    setActiveCameraIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleDept = (deptId: string) => {
    const deptCams = allCameras.filter(c => c.deptId === deptId).map(c => c.id)
    const allActive = deptCams.every(id => activeCameraIds.has(id))
    setActiveCameraIds(prev => {
      const next = new Set(prev)
      deptCams.forEach(id => allActive ? next.delete(id) : next.add(id))
      return next
    })
  }
  const toggleExpandDept = (id: string) => setExpandedDepts(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  // Visible cameras
  const visibleCameras = useMemo(() => allCameras.filter(c => activeCameraIds.has(c.id)), [activeCameraIds])
  const activeCamCount = activeCameraIds.size

  // Map camera name → analyzed event
  const cameraAnalysis = useMemo(() => {
    const map: Record<string, typeof analyzedEvents[0]> = {}
    analyzedEvents.forEach(ev => { map[ev.videoId] = ev })
    return map
  }, [])

  const incidentCount = events.length
  const criticalCount = events.filter(e => {
    const t = (e.type || "").toLowerCase()
    return t.includes("aggression") || t.includes("assault") || t.includes("fall") || t.includes("fire") || t.includes("danger")
  }).length

  // Derived archived events based on current playback of archive videos
  const activeArchiveEvents = useMemo(() => {
    const list: any[] = []
    
    // Check all sources (both library selections and camera slot overrides)
    const sourcesToTrack = [
      ...selectedArchiveVideos.map(v => ({ id: v.id, video: v })),
      ...Object.entries(cameraSources).map(([id, src]) => ({ id, video: src.video }))
    ]

    sourcesToTrack.forEach(src => {
      if (src.video?.timestamps) {
        const currentTime = videoTimes[src.id] || 0
        src.video.timestamps.forEach(ts => {
          const [m, s] = ts.timestamp.split(":").map(Number)
          const tsSeconds = m * 60 + s
          
          // CRITICAL: We set the timestamp.getTime() to match the tsSeconds 
          // so the EventFeed's time-sync logic (ABS difference < 1s) triggers it!
          const syncTimestamp = new Date(tsSeconds * 1000)

          list.push({
            id: `arch-${src.id}-${ts.timestamp}`,
            type: ts.description, // USE RAW DESCRIPTION SO ICON MAPPING WORKS
            crimeType: [ts.isDangerous ? "Critical" : "Neutral"],
            timestamp: syncTimestamp, 
            time: ts.timestamp,
            description: ts.description,
            isDangerous: ts.isDangerous,
            videoId: src.video?.id,
            isArchive: true,
            camera: {
              id: src.id,
              name: src.video?.name || "Archive Cam",
              address: "SECURE STORAGE ZONE",
              department: "ARCHIVE"
            }
          })
        })
      }
    })
    return list
  }, [cameraSources, selectedArchiveVideos, videoTimes])

  // Merge live events with playing archive events
  const mergedEvents = useMemo(() => {
    return [...activeArchiveEvents, ...events].sort((a, b) => {
      const timeA = a.time || ""
      const timeB = b.time || ""
      return timeB.localeCompare(timeA)
    })
  }, [activeArchiveEvents, events])

  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-300 relative flex flex-col pt-16 font-sans">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <main className="relative z-10 w-full max-w-[1800px] mx-auto px-4 sm:px-6 py-6">

        {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 pb-5 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-500">System Online</span>
              <span className="mx-2 text-neutral-700">|</span>
              <Shield className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400">Suraksha AI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Hospital Security <span className="text-neutral-600 font-light">Matrix</span>
            </h1>
          </div>

          {/* Header stat chips */}
          <div className="flex flex-wrap gap-3 sm:gap-4 sm:justify-end">
            {[
              { label: "Active Cameras", value: `${activeCamCount}/${totalCams}`, icon: Camera, color: "text-blue-400 border-blue-500/20 bg-blue-500/5" },
              { label: "Incidents", value: incidentCount, icon: AlertTriangle, color: "text-yellow-400 border-yellow-500/20 bg-yellow-500/5" },
              { label: "Critical", value: criticalCount, icon: Flame, color: "text-red-400 border-red-500/20 bg-red-500/5" },
              { label: "Departments", value: locations.length, icon: LayoutGrid, color: "text-purple-400 border-purple-500/20 bg-purple-500/5" },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${s.color}`}>
                <s.icon className="w-3.5 h-3.5" />
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-widest opacity-70">{s.label}</div>
                  <div className="text-sm font-bold leading-none mt-0.5">{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN GRID ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

          {/* ── LEFT: Camera grid + selector ─────────────────────────────── */}
          <div className="xl:col-span-9 space-y-6">

            {/* ── Alert Ticker Strip ──────────────────────────────────────────── */}
          <div className="mb-6 rounded-xl overflow-hidden border border-red-500/15 bg-red-500/[0.04]">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-red-500/10 border-r border-red-500/15">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[9px] font-mono uppercase tracking-widest text-red-400 whitespace-nowrap">Alert Feed</span>
              </div>
              <div className="flex-1 overflow-hidden ticker-wrap py-2">
                <div className="ticker-content">
                  {[
                    "🔴 HIGH PRIORITY · Patient aggression reported in ER Triage Zone A",
                    "🟡 WARNING · Staff negligence flagged in Ward B nursing station",
                    "🔴 CRITICAL · Unauthorized access attempt at ICU restricted zone",
                    "🟡 NOTICE · Overcrowding detected in Emergency Waiting Area — 14 persons",
                    "🔴 HIGH PRIORITY · Patient fall risk detected in Ward C corridor",
                    "🟡 WARNING · Pharmacy storage access outside authorized hours",
                    "🔴 CRITICAL · Fire/smoke detector triggered near Server Room",
                    "🟢 RESOLVED · Security team responded to incident in Gate-Main — 2m ago",
                    /* duplicate for seamless loop */
                    "🔴 HIGH PRIORITY · Patient aggression reported in ER Triage Zone A",
                    "🟡 WARNING · Staff negligence flagged in Ward B nursing station",
                    "🔴 CRITICAL · Unauthorized access attempt at ICU restricted zone",
                    "🟡 NOTICE · Overcrowding detected in Emergency Waiting Area — 14 persons",
                    "🔴 HIGH PRIORITY · Patient fall risk detected in Ward C corridor",
                    "🟡 WARNING · Pharmacy storage access outside authorized hours",
                    "🔴 CRITICAL · Fire/smoke detector triggered near Server Room",
                    "🟢 RESOLVED · Security team responded to incident in Gate-Main — 2m ago",
                  ].map((msg, i) => (
                    <span key={i} className="inline-flex items-center text-[10px] font-mono text-neutral-400 mr-10">
                      {msg}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
            <PluginManager />

            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl overflow-hidden mt-6">
              <div className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-800/30 transition-colors">
                {/* Clickable label area */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectorOpen(p => !p)}
                  onKeyDown={e => e.key === "Enter" && setSelectorOpen(p => !p)}
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-mono uppercase tracking-widest text-neutral-300">Camera Selection</span>
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/20 text-[9px] font-mono text-blue-400">
                    {activeCamCount}/{totalCams} active
                  </span>
                </div>
                {/* Action buttons — NOT inside the toggle button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCameraIds(new Set(allCameras.map(c => c.id)))}
                    className="text-[9px] font-mono uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors px-2 py-0.5 border border-emerald-500/20 rounded"
                  >All On</button>
                  <button
                    type="button"
                    onClick={() => setActiveCameraIds(new Set())}
                    className="text-[9px] font-mono uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors px-2 py-0.5 border border-red-500/20 rounded"
                  >All Off</button>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectorOpen(p => !p)}
                    onKeyDown={e => e.key === "Enter" && setSelectorOpen(p => !p)}
                    className="cursor-pointer"
                  >
                    {selectorOpen ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {selectorOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-neutral-800"
                  >
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {locations.map(loc => {
                        const locCams = allCameras.filter(c => c.deptId === loc.id)
                        const allOn = locCams.every(c => activeCameraIds.has(c.id))
                        const someOn = locCams.some(c => activeCameraIds.has(c.id))
                        const isExpanded = expandedDepts.has(loc.id)
                        return (
                          <div key={loc.id} className="border border-neutral-800 rounded-lg overflow-hidden">
                            {/* Dept header */}
                            <div className="flex items-center justify-between px-3 py-2 bg-neutral-800/40">
                              <button onClick={() => toggleExpandDept(loc.id)} className="flex items-center gap-2 flex-1 text-left">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${allOn ? "bg-emerald-500" : someOn ? "bg-yellow-500" : "bg-neutral-600"}`} />
                                <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-widest truncate">{loc.name}</span>
                                <span className="text-[9px] text-neutral-600 ml-auto">{locCams.filter(c => activeCameraIds.has(c.id)).length}/{locCams.length}</span>
                              </button>
                              <button
                                onClick={() => toggleDept(loc.id)}
                                className={`ml-2 px-2 py-0.5 rounded text-[9px] font-mono border transition-colors ${allOn ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"}`}
                              >{allOn ? "Off" : "On"}</button>
                              {isExpanded ? <ChevronUp className="w-3 h-3 text-neutral-600 ml-1" /> : <ChevronDown className="w-3 h-3 text-neutral-600 ml-1" />}
                            </div>
                            {/* Camera list */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                                  {locCams.map(cam => (
                                    <label key={cam.id} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-neutral-800/30 cursor-pointer transition-colors border-t border-neutral-800/50 first:border-t-0">
                                      <input
                                        type="checkbox"
                                        checked={activeCameraIds.has(cam.id)}
                                        onChange={() => toggleCamera(cam.id)}
                                        className="w-3 h-3 rounded accent-blue-500 cursor-pointer"
                                      />
                                      <span className="text-[10px] font-mono text-neutral-400 flex-1 truncate">{cam.name}</span>
                                      {activeCameraIds.has(cam.id)
                                        ? <Eye className="w-3 h-3 text-emerald-500/60" />
                                        : <EyeOff className="w-3 h-3 text-neutral-700" />
                                      }
                                    </label>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── ARCHIVE VIDEO SELECTOR ────────────────────────────────────────── */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl overflow-hidden mt-3">
              <div className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-800/30 transition-colors">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setArchiveSelectorOpen(p => !p)}
                  onKeyDown={e => e.key === "Enter" && setArchiveSelectorOpen(p => !p)}
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                >
                  <Monitor className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-mono uppercase tracking-widest text-neutral-300">Archive Library</span>
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/20 text-[9px] font-mono text-yellow-400">
                    {selectedArchiveVideos.length} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setArchiveSelectorOpen(p => !p)}
                    onKeyDown={e => e.key === "Enter" && setArchiveSelectorOpen(p => !p)}
                    className="cursor-pointer"
                  >
                    {archiveSelectorOpen ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {archiveSelectorOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-neutral-800"
                  >
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {allArchiveVideos.map(video => {
                        const isSelected = selectedArchiveVideos.some(v => v.id === video.id)
                        return (
                          <label key={video.id} className={`flex flex-col gap-2 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-neutral-800/20 border-neutral-800 hover:border-neutral-700'}`}>
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedArchiveVideos(p => p.filter(v => v.id !== video.id))
                                  } else {
                                    setSelectedArchiveVideos(p => [...p, video])
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded accent-yellow-500 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-mono text-neutral-200 truncate">{video.name}</div>
                                <div className="text-[8px] font-mono text-neutral-600 uppercase tracking-widest">{video.id.slice(0, 8)}...</div>
                              </div>
                              <Activity className={`w-3 h-3 ${isSelected ? 'text-yellow-400 animate-pulse' : 'text-neutral-700'}`} />
                            </div>
                          </label>
                        )
                      })}
                      {allArchiveVideos.length === 0 && (
                        <div className="col-span-full py-6 text-center text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
                          No videos found in library
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Archive analysis section */}
            <AnimatePresence>
              {selectedArchiveVideos.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Incident Archive Analysis</span>
                      <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-[9px] font-mono text-yellow-400">{selectedArchiveVideos.length} video{selectedArchiveVideos.length > 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedArchiveVideos.map(video => {
                      const isHighlighted = hoveredCamera === video.id
                      const isDimmed = hoveredCamera !== null && !isHighlighted
                      
                      return (
                        <motion.div 
                          key={video.id} 
                          animate={{ opacity: isDimmed ? 0.35 : 1, scale: isHighlighted ? 1.02 : 1 }}
                          className={`bg-neutral-900 border rounded-xl overflow-hidden transition-all duration-200 group ${isHighlighted ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.15)]' : 'border-neutral-800 hover:border-blue-500/40'}`}
                          onMouseEnter={() => setHoveredCamera(video.id)}
                          onMouseLeave={() => setHoveredCamera(null)}
                        >
                          <div className="relative aspect-video bg-black">
                            {video.publicUrl && (
                              <video src={video.publicUrl} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-75 group-hover:opacity-95 transition-opacity" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
                            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm border border-white/10 rounded px-2 py-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                              <span className="text-[9px] font-mono text-white/80 uppercase tracking-widest truncate max-w-[160px]">{video.name}</span>
                            </div>
                            <button
                              onClick={() => setSelectedArchiveVideos(p => p.filter(v => v.id !== video.id))}
                              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-black/60 hover:bg-red-500/30 border border-white/10 hover:border-red-500/40 rounded transition-colors"
                            >
                              <X className="h-3 w-3 text-white/60 hover:text-red-400" />
                            </button>
                          </div>
                          <div className="p-3 flex items-center justify-between">
                            <div className="text-[10px] font-mono text-neutral-500 truncate max-w-[200px]">{video.name}</div>
                            <a
                              href={`/video/${video.id}`}
                              className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-400/40 px-2 py-1 rounded transition-colors"
                            >
                              <Activity className="w-3 h-3" /> Analyze
                            </a>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Camera Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Live Camera Network</span>
                        {visibleCameras.length < totalCams && (
                          <span className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-[9px] font-mono text-neutral-500">
                            {visibleCameras.length} visible
                          </span>
                        )}
                      </div>
                    </div>

              {visibleCameras.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-neutral-800 rounded-xl">
                  <EyeOff className="w-8 h-8 text-neutral-700 mb-3" />
                  <p className="text-neutral-500 text-sm font-mono">No cameras active</p>
                  <p className="text-neutral-700 text-xs mt-1">Use the selector above to enable cameras</p>
                  <button
                    onClick={() => setActiveCameraIds(new Set(allCameras.map(c => c.id)))}
                    className="mt-4 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-blue-400 border border-blue-500/20 hover:border-blue-400/40 px-3 py-1.5 rounded transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Enable All
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleCameras.map(camera => {
                    const analysis = cameraAnalysis[camera.name]
                    const incStyle = analysis ? getIncidentStyle(analysis.crimeType) : null
                    const isHighlighted = hoveredCamera === camera.id
                    const isDimmed = hoveredCamera !== null && !isHighlighted

                    return (
                      <motion.div
                        key={camera.id}
                        layout
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: isDimmed ? 0.35 : 1, scale: 1 }}
                        transition={{ duration: 0.15 }}
                        className="group"
                      >
                        <div
                          className={`relative rounded-xl overflow-hidden border transition-all duration-200 bg-neutral-900 cursor-pointer ${isHighlighted ? "border-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,0.12)]" : "border-neutral-800 hover:border-neutral-600"
                            }`}
                          onClick={() => setSelectedCamera(camera.id)}
                          onMouseEnter={() => setHoveredCamera(camera.id)}
                          onMouseLeave={() => setHoveredCamera(null)}
                        >
                          {/* Video feed — 16:9 */}
                          <div className="aspect-video relative camera-scanline camera-sweep">
                            <CameraFeed 
                              camera={camera} 
                              mode={cameraSources[camera.id]?.mode || "live"}
                              archiveUrl={cameraSources[camera.id]?.video?.publicUrl}
                              onTimeUpdate={time => handleTimeUpdate(camera.id, time)} 
                            />
                            
                            {/* Source Selector Overlay */}
                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                              <select 
                                className="bg-black/80 text-[8px] font-mono text-white border border-white/20 rounded px-1.5 py-1 outline-none pointer-events-auto cursor-pointer"
                                value={cameraSources[camera.id]?.mode || "live"}
                                onChange={(e) => {
                                  const mode = e.target.value as "live" | "archive"
                                  if (mode === "live") {
                                    setCameraSources(prev => ({ ...prev, [camera.id]: { mode: "live" } }))
                                  } else {
                                    // Default to first archive video if switching to archive mode
                                    setCameraSources(prev => ({ ...prev, [camera.id]: { mode: "archive", video: allArchiveVideos[0] } }))
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="live">📡 LIVE FEED</option>
                                <option value="archive">📁 ARCHIVE</option>
                              </select>
                            </div>

                            {/* Archive Video Picker (shows only if in archive mode) */}
                            {cameraSources[camera.id]?.mode === "archive" && (
                              <div className="absolute top-10 left-0 right-0 px-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                <select 
                                  className="w-full bg-blue-600/90 text-[8px] font-mono text-white border border-blue-400/30 rounded px-2 py-1.5 outline-none pointer-events-auto cursor-pointer shadow-xl"
                                  value={cameraSources[camera.id]?.video?.id}
                                  onChange={(e) => {
                                    const video = allArchiveVideos.find(v => v.id === e.target.value)
                                    setCameraSources(prev => ({ ...prev, [camera.id]: { mode: "archive", video } }))
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {allArchiveVideos.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          {/* Bottom info bar */}
                          <div className="px-3 py-2.5 bg-neutral-900/95 border-t border-neutral-800">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${cameraSources[camera.id]?.mode === 'archive' ? 'bg-blue-400' : 'bg-red-500 animate-pulse'} flex-shrink-0`} />
                                  <span className="text-[10px] font-mono font-semibold text-neutral-200 uppercase tracking-wider truncate">
                                    {cameraSources[camera.id]?.mode === 'archive' ? 'ARCHIVE REPLAY' : 'LIVE'}
                                  </span>
                                  <span className="mx-1 text-neutral-700">·</span>
                                  <span className="text-[10px] font-mono font-semibold text-neutral-300 uppercase tracking-wider truncate">{camera.name}</span>
                                </div>
                                <p className="text-[9px] text-neutral-600 font-mono truncate leading-none">
                                  {cameraSources[camera.id]?.mode === 'archive' ? `Source: ${cameraSources[camera.id]?.video?.name}` : camera.address}
                                </p>
                              </div>
                              {/* Incident badge from analysis */}
                              {incStyle && (
                                <div className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8px] font-mono uppercase tracking-widest ${incStyle.badge}`}>
                                  <span className={`w-1 h-1 rounded-full ${incStyle.dot} animate-pulse`} />
                                  {incStyle.label}
                                </div>
                              )}
                            </div>

                            {/* Analysis preview (if available) */}
                            {analysis && (
                              <div className="mt-2 pt-2 border-t border-neutral-800/80">
                                <div className="text-[8px] font-mono uppercase tracking-widest text-neutral-600 mb-1">
                                  Last Detected · {analysis.timeline[analysis.timeline.length - 1]?.time ?? "—"}
                                </div>
                                <p className="text-[9px] text-neutral-500 leading-relaxed line-clamp-2">
                                  {analysis.timeline[analysis.timeline.length - 1]?.event ?? "Monitoring..."}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Corner accents */}
                          <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-white/15 pointer-events-none rounded-tl" />
                          <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-white/15 pointer-events-none rounded-tr" />
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ────────────────────────────────────────────── */}
          <aside className="xl:col-span-3 space-y-4 sticky top-20">

            {/* Event stream */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Live Event Stream</span>
              </div>
              <div className="max-h-[380px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#27272a transparent" }}>
                <EventFeed
                  events={mergedEvents}
                  videoTimes={videoTimes}
                  onEventHover={setHoveredCamera}
                  onEventClick={handleEventClick}
                  highlightCameraId={hoveredCamera}
                />
              </div>
            </div>

            {/* System Stats */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">System Overview</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <StatsOverview />
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-neutral-800">
                {[
                  { label: "Active Incidents", value: criticalCount, color: "text-red-400" },
                  { label: "Uptime", value: "99.9%", color: "text-emerald-400" },
                  { label: "Cameras Live", value: `${activeCamCount}/${totalCams}`, color: "text-blue-400" },
                  { label: "Staff Monitored", value: "47", color: "text-neutral-200" },
                ].map(m => (
                  <div key={m.label} className="space-y-0.5">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-600">{m.label}</div>
                    <div className={`text-sm font-bold font-mono ${m.color}`}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Incident Analysis per department */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">Department Status</span>
              </div>
              <div className="space-y-2">
                {locations.map(loc => {
                  const locCams = allCameras.filter(c => c.deptId === loc.id)
                  const activeCount = locCams.filter(c => activeCameraIds.has(c.id)).length
                  const locAnalysis = analyzedEvents.filter(ev => locCams.some(c => c.name === ev.videoId))
                  const hasAlert = locAnalysis.length > 0
                  return (
                    <div key={loc.id} className={`flex items-center justify-between py-2 px-3 rounded-lg border transition-colors ${hasAlert && activeCount > 0 ? "border-red-500/20 bg-red-500/5" : "border-neutral-800 bg-neutral-800/30"}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeCount > 0 ? hasAlert ? "bg-red-500 animate-pulse" : "bg-emerald-500" : "bg-neutral-700"}`} />
                        <span className="text-[10px] font-mono text-neutral-400 truncate">{loc.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {hasAlert && activeCount > 0 && (
                          <span className="text-[8px] font-mono uppercase text-red-400 border border-red-500/25 bg-red-500/10 px-1.5 py-0.5 rounded">
                            {locAnalysis[0].crimeType[0]}
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-neutral-600">{activeCount}/{locCams.length}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>


          </aside>
        </div>
      </main>

      {/* Camera Modal */}
      {selectedCamera && (
        <CameraModal
          open={true}
          onOpenChange={open => !open && setSelectedCamera(null)}
          cameraId={selectedCamera}
          currentTime={videoTimes[selectedCamera]}
          date={new Date()}
        />
      )}
    </div>
  )
}
