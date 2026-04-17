"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  ArrowUpDown,
  Download,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Video,
  Clock,
  TrendingUp,
  TrendingDown,
  Eye,
  Bell,
  FileText,
  Search,
  RefreshCw,
  ChevronRight,
  Activity,
  Flame,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Timer,
  CheckCircle2,
  XCircle,
  Info,
  Send,
  Mail,
  MessageSquare,
} from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  LineController,
  Filler,
} from 'chart.js'
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2'
import { motion, AnimatePresence } from 'framer-motion'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  LineController,
  Filler
)

// ─── Types ───────────────────────────────────────────────────────────────────

interface KeyMoment {
  videoName: string
  timestamp: string
  description: string
  isDangerous: boolean
}

type ThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
type TabId = 'overview' | 'incidents' | 'analytics' | 'ai-insights'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateSecurityScore(moments: KeyMoment[]): number {
  if (moments.length === 0) return 100
  const dangerousCount = moments.filter(m => m.isDangerous).length
  const ratio = dangerousCount / moments.length
  return Math.max(0, Math.round(100 - ratio * 100))
}

function getThreatLevel(moments: KeyMoment[]): ThreatLevel {
  const dangerousCount = moments.filter(m => m.isDangerous).length
  if (dangerousCount === 0) return 'LOW'
  if (dangerousCount <= 2) return 'MEDIUM'
  if (dangerousCount <= 5) return 'HIGH'
  return 'CRITICAL'
}

function getThreatColor(level: ThreatLevel): string {
  switch (level) {
    case 'LOW': return 'text-emerald-400'
    case 'MEDIUM': return 'text-amber-400'
    case 'HIGH': return 'text-orange-500'
    case 'CRITICAL': return 'text-red-500'
  }
}

function getThreatBg(level: ThreatLevel): string {
  switch (level) {
    case 'LOW': return 'from-emerald-500/20 to-emerald-500/5'
    case 'MEDIUM': return 'from-amber-500/20 to-amber-500/5'
    case 'HIGH': return 'from-orange-500/20 to-orange-500/5'
    case 'CRITICAL': return 'from-red-500/20 to-red-500/5'
  }
}

function getThreatBorder(level: ThreatLevel): string {
  switch (level) {
    case 'LOW': return 'border-emerald-500/30'
    case 'MEDIUM': return 'border-amber-500/30'
    case 'HIGH': return 'border-orange-500/30'
    case 'CRITICAL': return 'border-red-500/30'
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

function categorizeThreat(description: string): string {
  const d = description.toLowerCase()
  if (d.includes('fire') || d.includes('flame') || d.includes('smoke') || d.includes('burn')) return 'Fire Hazard'
  if (d.includes('fall') || d.includes('slip') || d.includes('trip')) return 'Fall Risk'
  if (d.includes('fight') || d.includes('violen') || d.includes('weapon') || d.includes('attack')) return 'Violence'
  if (d.includes('medical') || d.includes('unconscious') || d.includes('seizure') || d.includes('heart')) return 'Medical Emergency'
  if (d.includes('theft') || d.includes('shoplift') || d.includes('steal') || d.includes('suspicious')) return 'Theft/Suspicious'
  if (d.includes('trespass') || d.includes('unauthorized') || d.includes('intrusion')) return 'Unauthorized Access'
  if (d.includes('electric') || d.includes('spark') || d.includes('malfunction')) return 'Equipment Failure'
  if (d.includes('danger')) return 'General Danger'
  return 'Other'
}

// ─── Animated Security Score Ring ─────────────────────────────────────────────

function SecurityScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference
  const color = getScoreColor(score)

  useEffect(() => {
    let frame: number
    const duration = 1500
    const start = performance.now()
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setAnimatedScore(Math.round(eased * score))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [score])

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1), stroke 0.5s' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold tabular-nums" style={{ color }}>{animatedScore}</span>
        <span className="text-xs text-zinc-400 mt-0.5">/ 100</span>
      </div>
    </div>
  )
}

// ─── Stat Card Component ─────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, delay = 0 }: {
  icon: any; label: string; value: string | number; sub?: string; color: string; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent p-5 backdrop-blur-xl hover:border-white/[0.12] transition-all duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg bg-gradient-to-br ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Incident Row ────────────────────────────────────────────────────────────

function IncidentTimelineItem({ moment, index }: { moment: KeyMoment; index: number }) {
  const category = categorizeThreat(moment.description)
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative flex gap-4 p-4 rounded-lg border transition-all duration-200 hover:bg-white/[0.03] ${
        moment.isDangerous
          ? 'border-red-500/20 bg-red-500/[0.03]'
          : 'border-white/[0.06] bg-white/[0.01]'
      }`}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        moment.isDangerous
          ? 'bg-red-500/20 text-red-400'
          : 'bg-emerald-500/20 text-emerald-400'
      }`}>
        {moment.isDangerous ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">{moment.videoName}</span>
          <Badge className={`text-[10px] px-1.5 py-0 ${
            moment.isDangerous
              ? 'bg-red-500/20 text-red-400 border-red-500/30'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          }`}>
            {moment.isDangerous ? 'DANGER' : 'SAFE'}
          </Badge>
          <Badge className="text-[10px] px-1.5 py-0 bg-zinc-800 text-zinc-400 border-zinc-700">
            {category}
          </Badge>
        </div>
        <p className="text-sm text-zinc-400 line-clamp-2">{moment.description}</p>
      </div>
      <div className="flex-shrink-0 flex items-center">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-800/50 px-2.5 py-1 rounded-full">
          <Clock className="w-3 h-3" />
          {moment.timestamp}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Recommendation Item ─────────────────────────────────────────────────────

function RecommendationItem({ text, priority, index }: { text: string; priority: 'high' | 'medium' | 'low'; index: number }) {
  const colors = {
    high: 'border-red-500/30 bg-red-500/5 text-red-400',
    medium: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
    low: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
  }
  const icons = { high: Flame, medium: AlertTriangle, low: CheckCircle2 }
  const PriorityIcon = icons[priority]

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`flex items-start gap-3 p-3 rounded-lg border ${colors[priority]}`}
    >
      <PriorityIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-zinc-300">{text}</p>
    </motion.div>
  )
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function StatisticsPage() {
  const [keyMoments, setKeyMoments] = useState<KeyMoment[]>([])
  const [summary, setSummary] = useState<string>('')
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [filterDangerous, setFilterDangerous] = useState<'all' | 'dangerous' | 'safe'>('all')
  const [showAlertConfig, setShowAlertConfig] = useState(false)

  // ─── Derived data ──────────────────────────────────────────────────────────
  const securityScore = useMemo(() => calculateSecurityScore(keyMoments), [keyMoments])
  const threatLevel = useMemo(() => getThreatLevel(keyMoments), [keyMoments])
  const dangerousMoments = useMemo(() => keyMoments.filter(m => m.isDangerous), [keyMoments])
  const safeMoments = useMemo(() => keyMoments.filter(m => !m.isDangerous), [keyMoments])
  const uniqueVideos = useMemo(() => [...new Set(keyMoments.map(m => m.videoName))], [keyMoments])

  const filteredMoments = useMemo(() => {
    let result = keyMoments
    if (filterDangerous === 'dangerous') result = result.filter(m => m.isDangerous)
    else if (filterDangerous === 'safe') result = result.filter(m => !m.isDangerous)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(m =>
        m.videoName.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.timestamp.includes(q)
      )
    }
    return result
  }, [keyMoments, filterDangerous, searchQuery])

  // Category distribution
  const categoryDistribution = useMemo(() => {
    const cats: Record<string, number> = {}
    dangerousMoments.forEach(m => {
      const cat = categorizeThreat(m.description)
      cats[cat] = (cats[cat] || 0) + 1
    })
    return cats
  }, [dangerousMoments])

  // Dangers per video
  const dangersPerVideo = useMemo(() => {
    const map: Record<string, { dangerous: number; safe: number }> = {}
    keyMoments.forEach(m => {
      if (!map[m.videoName]) map[m.videoName] = { dangerous: 0, safe: 0 }
      if (m.isDangerous) map[m.videoName].dangerous++
      else map[m.videoName].safe++
    })
    return map
  }, [keyMoments])

  // Recommendations
  const recommendations = useMemo(() => {
    const recs: { text: string; priority: 'high' | 'medium' | 'low' }[] = []
    const cats = categoryDistribution

    if (cats['Fire Hazard']) {
      recs.push({ text: `${cats['Fire Hazard']} fire hazard incident(s) detected. Ensure fire extinguishers are accessible, sprinkler systems are functional, and emergency exits are clearly marked.`, priority: 'high' })
    }
    if (cats['Violence']) {
      recs.push({ text: `${cats['Violence']} violence-related incident(s) detected. Consider increasing security personnel presence and installing panic buttons in vulnerable areas.`, priority: 'high' })
    }
    if (cats['Equipment Failure']) {
      recs.push({ text: `${cats['Equipment Failure']} equipment failure(s) detected. Schedule immediate maintenance inspection and consider upgrading electrical safety systems.`, priority: 'high' })
    }
    if (cats['Fall Risk']) {
      recs.push({ text: `${cats['Fall Risk']} fall risk incident(s) detected. Review floor conditions, lighting, and signage in affected areas.`, priority: 'medium' })
    }
    if (cats['Medical Emergency']) {
      recs.push({ text: `${cats['Medical Emergency']} medical emergency(ies) detected. Ensure first aid kits are stocked and staff are trained in basic first aid/CPR.`, priority: 'high' })
    }
    if (cats['Theft/Suspicious']) {
      recs.push({ text: `${cats['Theft/Suspicious']} suspicious activity incident(s). Review camera placement and consider adding motion-activated alerts for after-hours.`, priority: 'medium' })
    }
    if (cats['Unauthorized Access']) {
      recs.push({ text: `${cats['Unauthorized Access']} unauthorized access attempt(s). Strengthen access control systems and review perimeter security.`, priority: 'high' })
    }

    if (dangerousMoments.length > 0 && uniqueVideos.length > 0) {
      const avgDanger = dangerousMoments.length / uniqueVideos.length
      if (avgDanger > 2) {
        recs.push({ text: `High incident density detected (avg ${avgDanger.toFixed(1)} threats/video). Consider increasing monitoring frequency and adding real-time alert escalation.`, priority: 'medium' })
      }
    }

    if (securityScore >= 80) {
      recs.push({ text: 'Security posture is strong. Continue routine monitoring and maintain current protocols.', priority: 'low' })
    }

    if (recs.length === 0) {
      recs.push({ text: 'No significant threats detected. Maintain standard security protocols and regular surveillance checks.', priority: 'low' })
    }

    return recs
  }, [categoryDistribution, dangerousMoments, uniqueVideos, securityScore])

  // ─── Fetch summary ────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async (momentsData: KeyMoment[]) => {
    setIsLoadingSummary(true)
    setSummary('')
    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyMoments: momentsData })
      })
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setSummary(data.summary)
    } catch (error: any) {
      console.error('Error fetching summary:', error)
      setSummary(`Error: ${error?.message || 'Unable to generate summary at this time.'}`)
    } finally {
      setIsLoadingSummary(false)
    }
  }, [])

  // ─── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const savedVideos = JSON.parse(localStorage.getItem("savedVideos") || "[]")
    const moments: KeyMoment[] = savedVideos.flatMap((video: any) =>
      video.timestamps.map((ts: any) => ({
        videoName: video.name,
        timestamp: ts.timestamp,
        description: ts.description,
        isDangerous: ts.isDangerous || false,
      }))
    )
    setKeyMoments(moments)
    if (moments.length > 0) fetchSummary(moments)
  }, [fetchSummary])

  // ─── Chart data ────────────────────────────────────────────────────────────
  const chartDangerByVideo = useMemo(() => {
    const labels = Object.keys(dangersPerVideo)
    return {
      labels,
      datasets: [
        {
          label: 'Dangerous',
          data: labels.map(v => dangersPerVideo[v].dangerous),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: 'Safe',
          data: labels.map(v => dangersPerVideo[v].safe),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }
  }, [dangersPerVideo])

  const chartSafetyDoughnut = useMemo(() => ({
    labels: ['Dangerous', 'Safe'],
    datasets: [{
      data: [dangerousMoments.length, safeMoments.length],
      backgroundColor: ['rgba(239, 68, 68, 0.8)', 'rgba(16, 185, 129, 0.8)'],
      borderColor: ['rgba(239, 68, 68, 1)', 'rgba(16, 185, 129, 1)'],
      borderWidth: 2,
      spacing: 4,
    }],
  }), [dangerousMoments, safeMoments])

  const chartCategoryPie = useMemo(() => {
    const labels = Object.keys(categoryDistribution)
    const colors = [
      'rgba(239, 68, 68, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(168, 85, 247, 0.8)',
      'rgba(59, 130, 246, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(20, 184, 166, 0.8)',
      'rgba(249, 115, 22, 0.8)',
      'rgba(107, 114, 128, 0.8)',
    ]
    return {
      labels,
      datasets: [{
        data: Object.values(categoryDistribution),
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length).map(c => c.replace('0.8', '1')),
        borderWidth: 2,
      }],
    }
  }, [categoryDistribution])

  const chartTimeline = useMemo(() => {
    const trendData: Record<string, number> = {}
    dangerousMoments.forEach(m => {
      const parts = m.timestamp.split(':').map(Number)
      if (parts.length >= 2) {
        const [hours, minutes] = parts
        const interval = `${String(hours).padStart(2, '0')}:${String(Math.floor(minutes / 15) * 15).padStart(2, '0')}`
        trendData[interval] = (trendData[interval] || 0) + 1
      }
    })
    const sorted = Object.keys(trendData).sort()
    return {
      labels: sorted,
      datasets: [{
        label: 'Threat Events',
        data: sorted.map(k => trendData[k]),
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.8)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(239, 68, 68, 1)',
        pointRadius: 4,
        pointHoverRadius: 6,
      }],
    }
  }, [dangerousMoments])

  // ─── CSV Export ────────────────────────────────────────────────────────────
  const exportToCSV = () => {
    const csvContent = [
      ['Video Name', 'Timestamp', 'Description', 'Is Dangerous', 'Category'].join(','),
      ...filteredMoments.map(moment => [
        moment.videoName,
        moment.timestamp,
        `"${moment.description}"`,
        moment.isDangerous ? 'Yes' : 'No',
        categorizeThreat(moment.description),
      ].join(','))
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.setAttribute('href', URL.createObjectURL(blob))
    link.setAttribute('download', `nazar-security-report-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // PDF-style text report export
  const exportReport = () => {
    const report = [
      '═══════════════════════════════════════',
      '       NAZAR AI - SECURITY REPORT',
      '═══════════════════════════════════════',
      `Date: ${new Date().toLocaleString()}`,
      `Security Score: ${securityScore}/100`,
      `Threat Level: ${threatLevel}`,
      `Total Incidents: ${keyMoments.length}`,
      `Dangerous Events: ${dangerousMoments.length}`,
      `Videos Analyzed: ${uniqueVideos.length}`,
      '',
      '─── THREAT BREAKDOWN ───',
      ...Object.entries(categoryDistribution).map(([cat, count]) => `  • ${cat}: ${count}`),
      '',
      '─── RECOMMENDATIONS ───',
      ...recommendations.map((r, i) => `  ${i + 1}. [${r.priority.toUpperCase()}] ${r.text}`),
      '',
      '─── INCIDENT LOG ───',
      ...keyMoments.map(m =>
        `  [${m.timestamp}] ${m.videoName} - ${m.isDangerous ? '⚠ DANGER' : '✓ Safe'}\n    ${m.description}`
      ),
      '',
      summary ? `─── AI ANALYSIS ───\n${summary}` : '',
      '',
      '═══════════════════════════════════════',
      'Report generated by Nazar AI Surveillance System',
    ].join('\n')

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' })
    const link = document.createElement('a')
    link.setAttribute('href', URL.createObjectURL(blob))
    link.setAttribute('download', `nazar-security-report-${new Date().toISOString().split('T')[0]}.txt`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ─── Table Columns ─────────────────────────────────────────────────────────
  const columnHelper = createColumnHelper<KeyMoment>()
  const columns = [
    columnHelper.accessor("videoName", {
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="text-xs px-2">
          Video <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: (info) => (
        <div className="flex items-center gap-2">
          <Video className="w-3.5 h-3.5 text-zinc-500" />
          <span className="font-medium text-sm">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor("timestamp", {
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="text-xs px-2">
          Time <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: (info) => (
        <span className="flex items-center gap-1.5 text-sm text-zinc-400">
          <Clock className="w-3 h-3" />{info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("description", {
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="text-xs px-2">
          Description <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: (info) => <span className="text-sm text-zinc-300 line-clamp-2">{info.getValue()}</span>,
    }),
    columnHelper.accessor("isDangerous", {
      header: "Status",
      cell: (info) => {
        const isDangerous = info.getValue()
        const cat = categorizeThreat(info.row.original.description)
        return (
          <div className="flex items-center gap-2">
            <Badge className={`text-[10px] whitespace-nowrap ${
              isDangerous
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}>
              {isDangerous ? '⚠ DANGER' : '✓ SAFE'}
            </Badge>
            {isDangerous && (
              <Badge className="text-[10px] bg-zinc-800 text-zinc-400 border-zinc-700 whitespace-nowrap">{cat}</Badge>
            )}
          </div>
        )
      },
    }),
  ]

  const table = useReactTable({
    data: filteredMoments,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  // ─── Tab definitions ──────────────────────────────────────────────────────
  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'incidents', label: 'Incidents', icon: ShieldAlert },
    { id: 'analytics', label: 'Analytics', icon: PieChartIcon },
    { id: 'ai-insights', label: 'AI Insights', icon: Zap },
  ]

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } },
      },
    },
    scales: {
      x: { ticks: { color: 'rgba(255,255,255,0.4)' }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ticks: { color: 'rgba(255,255,255,0.4)' }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true },
    },
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, padding: 16 },
      },
    },
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/[0.03] rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/[0.03] rounded-full blur-[128px]" />
        {threatLevel === 'CRITICAL' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/[0.03] rounded-full blur-[200px] animate-pulse" />
        )}
      </div>

      <div className="relative max-w-[1400px] mx-auto px-6 py-8">
        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-500/20">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Security Command Center
              </h1>
            </div>
            <p className="text-sm text-zinc-500 ml-[52px]">
              Real-time security monitoring & threat analysis powered by Nazar AI
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2 bg-white/[0.03] border-white/10 hover:bg-white/[0.06] text-zinc-300">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={exportReport} size="sm" className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 text-white">
              <FileText className="h-4 w-4" /> Full Report
            </Button>
          </div>
        </motion.div>

        {/* ─── Top Section: Score + Stats ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Security Score Card */}
          <motion.div
            initial={{ opacity:0, scale: 0.95 }}
            animate={{ opacity:1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className={`lg:col-span-4 rounded-2xl border p-6 bg-gradient-to-br backdrop-blur-xl ${getThreatBg(threatLevel)} ${getThreatBorder(threatLevel)}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Security Score</p>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getThreatColor(threatLevel)}`}>{threatLevel}</span>
                  <span className="text-xs text-zinc-600">Threat Level</span>
                </div>
              </div>
              <div className={`p-2 rounded-full ${
                threatLevel === 'LOW' ? 'bg-emerald-500/20' :
                threatLevel === 'MEDIUM' ? 'bg-amber-500/20' :
                threatLevel === 'HIGH' ? 'bg-orange-500/20' : 'bg-red-500/20 animate-pulse'
              }`}>
                {threatLevel === 'LOW' ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> :
                 threatLevel === 'MEDIUM' ? <Shield className="w-5 h-5 text-amber-400" /> :
                 <ShieldAlert className={`w-5 h-5 ${threatLevel === 'CRITICAL' ? 'text-red-400' : 'text-orange-400'}`} />}
              </div>
            </div>
            <div className="flex items-center justify-center py-4">
              <SecurityScoreRing score={securityScore} />
            </div>
            <p className="text-xs text-zinc-500 text-center mt-2">
              {securityScore >= 80 ? 'Your security posture is strong' :
               securityScore >= 60 ? 'Some security concerns need attention' :
               securityScore >= 40 ? 'Multiple threats require immediate action' :
               'Critical security situation — take action now'}
            </p>
          </motion.div>

          {/* Stats Grid */}
          <div className="lg:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Eye} label="Total Incidents" value={keyMoments.length} sub="All analyzed events" color="from-blue-500/30 to-blue-600/10" delay={0.1} />
            <StatCard icon={AlertTriangle} label="Threats Found" value={dangerousMoments.length} sub={`${keyMoments.length > 0 ? ((dangerousMoments.length / keyMoments.length) * 100).toFixed(0) : 0}% danger rate`} color="from-red-500/30 to-red-600/10" delay={0.2} />
            <StatCard icon={Video} label="Videos Analyzed" value={uniqueVideos.length} sub="Unique sources" color="from-purple-500/30 to-purple-600/10" delay={0.3} />
            <StatCard icon={Activity} label="Categories" value={Object.keys(categoryDistribution).length} sub="Threat types found" color="from-amber-500/30 to-amber-600/10" delay={0.4} />
            <StatCard icon={ShieldCheck} label="Safe Events" value={safeMoments.length} sub="No threats detected" color="from-emerald-500/30 to-emerald-600/10" delay={0.5} />
            <StatCard icon={Flame} label="Top Threat" value={Object.entries(categoryDistribution).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'None'} sub={Object.entries(categoryDistribution).sort((a,b)=>b[1]-a[1])[0] ? `${Object.entries(categoryDistribution).sort((a,b)=>b[1]-a[1])[0][1]} incidents` : 'All clear'} color="from-orange-500/30 to-orange-600/10" delay={0.6} />
            <StatCard icon={Timer} label="Latest Event" value={keyMoments.length > 0 ? keyMoments[keyMoments.length - 1].timestamp : '--:--'} sub={keyMoments.length > 0 ? keyMoments[keyMoments.length - 1].videoName : 'No events'} color="from-cyan-500/30 to-cyan-600/10" delay={0.7} />
            <StatCard icon={TrendingUp} label="Danger Density" value={uniqueVideos.length > 0 ? (dangerousMoments.length / uniqueVideos.length).toFixed(1) : '0'} sub="Threats per video" color="from-pink-500/30 to-pink-600/10" delay={0.8} />
          </div>
        </div>

        {/* ─── Tab Navigation ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-6 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] w-fit">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white/[0.08] text-white shadow-lg'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ─── Tab Content ────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {/* ══════ OVERVIEW TAB ══════ */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-xl">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" /> Incidents by Video
                  </h3>
                  <div className="h-[240px]">
                    {Object.keys(dangersPerVideo).length > 0 ? (
                      <Bar data={chartDangerByVideo} options={chartOptions} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-zinc-600">No data available</div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-xl">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-emerald-400" /> Safety Distribution
                  </h3>
                  <div className="h-[240px]">
                    {keyMoments.length > 0 ? (
                      <Doughnut data={chartSafetyDoughnut} options={pieOptions} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-zinc-600">No data available</div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-xl">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-red-400" /> Threat Timeline
                  </h3>
                  <div className="h-[240px]">
                    {dangerousMoments.length > 0 ? (
                      <Line data={chartTimeline} options={chartOptions} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-zinc-600">No threats to display</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-purple-400" /> Security Recommendations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recommendations.map((rec, i) => (
                    <RecommendationItem key={i} text={rec.text} priority={rec.priority} index={i} />
                  ))}
                </div>
              </div>

              {/* Recent dangerous events quick view */}
              {dangerousMoments.length > 0 && (
                <div className="rounded-xl border border-red-500/10 bg-red-500/[0.02] p-6 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-400" /> Recent Threats
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('incidents')} className="text-zinc-400 gap-1 hover:text-white">
                      View All <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {dangerousMoments.slice(0, 4).map((m, i) => (
                      <IncidentTimelineItem key={i} moment={m} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ══════ INCIDENTS TAB ══════ */}
          {activeTab === 'incidents' && (
            <motion.div
              key="incidents"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search incidents..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/[0.03] border-white/[0.08] text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {(['all', 'dangerous', 'safe'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterDangerous(f)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        filterDangerous === f
                          ? f === 'dangerous'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : f === 'safe'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-white/[0.08] text-white border-white/20'
                          : 'bg-transparent text-zinc-500 border-white/[0.06] hover:bg-white/[0.03]'
                      }`}
                    >
                      {f === 'all' ? `All (${keyMoments.length})` : f === 'dangerous' ? `Threats (${dangerousMoments.length})` : `Safe (${safeMoments.length})`}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-zinc-600 ml-auto">
                  Showing {filteredMoments.length} of {keyMoments.length} incidents
                </span>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.01] backdrop-blur-xl">
                <table className="w-full">
                  <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id} className="border-b border-white/[0.06]">
                        {headerGroup.headers.map(header => (
                          <th key={header.id} className="px-4 py-3 text-left bg-white/[0.02]">
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map(row => (
                        <tr
                          key={row.id}
                          className={`border-b border-white/[0.04] transition-colors ${
                            row.original.isDangerous ? 'hover:bg-red-500/[0.03]' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="px-4 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={columns.length} className="h-24 text-center text-zinc-600">
                          {searchQuery ? 'No incidents match your search' : 'No incidents recorded yet'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Incident Timeline View */}
              {filteredMoments.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" /> Incident Timeline
                  </h3>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredMoments.map((m, i) => (
                      <IncidentTimelineItem key={i} moment={m} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ══════ ANALYTICS TAB ══════ */}
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Danger by Video (Stacked) */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" /> Incidents Breakdown by Video
                  </h3>
                  <div className="h-[300px]">
                    {Object.keys(dangersPerVideo).length > 0 ? (
                      <Bar data={chartDangerByVideo} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { display: false } } }} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-zinc-600">No data</div>
                    )}
                  </div>
                </div>

                {/* Threat Category Distribution */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-purple-400" /> Threat Category Breakdown
                  </h3>
                  <div className="h-[300px]">
                    {Object.keys(categoryDistribution).length > 0 ? (
                      <Pie data={chartCategoryPie} options={pieOptions} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-zinc-600">No threat categories</div>
                    )}
                  </div>
                </div>

                {/* Threat Timeline */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl lg:col-span-2">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-red-400" /> Threat Activity Timeline (15min intervals)
                  </h3>
                  <div className="h-[280px]">
                    {dangerousMoments.length > 0 ? (
                      <Line data={chartTimeline} options={{
                        ...chartOptions,
                        plugins: { ...chartOptions.plugins, title: { display: false } },
                        scales: {
                          ...chartOptions.scales,
                          y: { ...chartOptions.scales.y, title: { display: true, text: 'Number of Threats', color: 'rgba(255,255,255,0.3)' } },
                          x: { ...chartOptions.scales.x, title: { display: true, text: 'Time Interval', color: 'rgba(255,255,255,0.3)' } },
                        },
                      }} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-zinc-600">No threat timeline data</div>
                    )}
                  </div>
                </div>

                {/* Safety Distribution */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Overall Safety Ratio
                  </h3>
                  <div className="h-[300px]">
                    {keyMoments.length > 0 ? (
                      <Doughnut data={chartSafetyDoughnut} options={pieOptions} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-zinc-600">No data</div>
                    )}
                  </div>
                </div>

                {/* Video Risk Matrix */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" /> Video Risk Assessment
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(dangersPerVideo).map(([name, data]) => {
                      const total = data.dangerous + data.safe
                      const dangerPct = total > 0 ? (data.dangerous / total) * 100 : 0
                      return (
                        <div key={name} className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-300 flex items-center gap-1.5">
                              <Video className="w-3 h-3 text-zinc-500" /> {name}
                            </span>
                            <span className={`text-xs font-medium ${dangerPct > 50 ? 'text-red-400' : dangerPct > 25 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {dangerPct.toFixed(0)}% risk
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                dangerPct > 50 ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                                dangerPct > 25 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
                                'bg-gradient-to-r from-emerald-500 to-green-500'
                              }`}
                              style={{ width: `${dangerPct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                    {Object.keys(dangersPerVideo).length === 0 && (
                      <p className="text-sm text-zinc-600 text-center py-8">No videos analyzed yet</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════ AI INSIGHTS TAB ══════ */}
          {activeTab === 'ai-insights' && (
            <motion.div
              key="ai-insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* AI Summary */}
              <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.04] to-blue-500/[0.04] p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" /> AI Analysis Summary
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isLoadingSummary || keyMoments.length === 0}
                    onClick={() => fetchSummary(keyMoments)}
                    className="gap-2 text-zinc-400 hover:text-white"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingSummary ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                </div>
                {isLoadingSummary ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-2 border-purple-500/20" />
                      <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-purple-500 animate-spin" />
                    </div>
                    <p className="text-sm text-zinc-500">AI is analyzing your security data...</p>
                  </div>
                ) : summary && summary.startsWith('Error:') ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <XCircle className="w-8 h-8 text-red-400/60" />
                    <p className="text-red-400/80 text-sm text-center">{summary}</p>
                    <Button variant="outline" size="sm" onClick={() => fetchSummary(keyMoments)} className="gap-2 border-red-500/20 text-red-400 hover:bg-red-500/10">
                      <RefreshCw className="w-4 h-4" /> Retry
                    </Button>
                  </div>
                ) : summary ? (
                  <div className="prose prose-invert max-w-none">
                    <div className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">{summary}</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <Info className="w-8 h-8 text-zinc-600" />
                    <p className="text-sm text-zinc-600 text-center">
                      {keyMoments.length === 0
                        ? 'No video data available. Analyze some videos to get AI-powered insights.'
                        : 'Click "Regenerate" to generate an AI analysis.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Security Recommendations */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Actionable Recommendations
                </h3>
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <RecommendationItem key={i} text={rec.text} priority={rec.priority} index={i} />
                  ))}
                </div>
              </div>

              {/* Quick Actions for Security Personnel */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-400" /> Quick Alert Actions
                </h3>
                <p className="text-sm text-zinc-500 mb-4">Quickly notify security teams about the current threat assessment.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="gap-2 bg-white/[0.02] border-white/[0.08] hover:bg-blue-500/10 hover:border-blue-500/30 text-zinc-300 justify-start h-auto py-3"
                    onClick={() => {
                      window.open(`mailto:?subject=Nazar AI Security Alert - ${threatLevel}&body=${encodeURIComponent(
                        `Security Alert from Nazar AI\n\nThreat Level: ${threatLevel}\nSecurity Score: ${securityScore}/100\nDangerous Events: ${dangerousMoments.length}\n\nPlease review the security dashboard for details.`
                      )}`)
                    }}
                  >
                    <Mail className="w-4 h-4 text-blue-400" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Email Alert</p>
                      <p className="text-[10px] text-zinc-500">Send via email client</p>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 bg-white/[0.02] border-white/[0.08] hover:bg-emerald-500/10 hover:border-emerald-500/30 text-zinc-300 justify-start h-auto py-3"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/send-telegram', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ message: `🚨 Nazar AI Alert\nThreat: ${threatLevel}\nScore: ${securityScore}/100\nDangers: ${dangerousMoments.length}\nCheck dashboard for details.` })
                        })
                        if (res.ok) alert('Telegram alert sent successfully!')
                        else alert('Failed to send Telegram alert')
                      } catch { alert('Error sending Telegram alert') }
                    }}
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Telegram Alert</p>
                      <p className="text-[10px] text-zinc-500">Notify via Telegram bot</p>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 bg-white/[0.02] border-white/[0.08] hover:bg-green-500/10 hover:border-green-500/30 text-zinc-300 justify-start h-auto py-3"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/send-whatsapp', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ message: `🚨 Nazar AI Alert\nThreat: ${threatLevel}\nScore: ${securityScore}/100\nDangers: ${dangerousMoments.length}\nCheck dashboard for details.` })
                        })
                        if (res.ok) alert('WhatsApp alert sent successfully!')
                        else alert('Failed to send WhatsApp alert')
                      } catch { alert('Error sending WhatsApp alert') }
                    }}
                  >
                    <Bell className="w-4 h-4 text-green-400" />
                    <div className="text-left">
                      <p className="text-sm font-medium">WhatsApp Alert</p>
                      <p className="text-[10px] text-zinc-500">Send via Twilio</p>
                    </div>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  )
}
