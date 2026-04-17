"use client"

import { Button } from "@/components/ui/button"
import { Clock, AlertTriangle, Shield, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react"
import type { Timestamp } from "@/app/types"
import { useState, useEffect, useRef } from "react"

interface TimestampListProps {
  timestamps: Timestamp[]
  onTimestampClick: (timestamp: string) => void
}

export default function TimestampList({ timestamps, onTimestampClick }: TimestampListProps) {
  const [expandedItems, setExpandedItems] = useState<number[]>([])
  const [longDescriptions, setLongDescriptions] = useState<number[]>([])
  const textRefs = useRef<(HTMLParagraphElement | null)[]>([])

  useEffect(() => {
    const checkTextOverflow = () => {
      const longItems = timestamps
        .map((_, index) => {
          const textElement = textRefs.current[index]
          if (!textElement) return { index, hasOverflow: false }

          // Check if the element has overflow and ellipsis
          const hasOverflow = (
            textElement.offsetWidth < textElement.scrollWidth ||
            textElement.offsetHeight < textElement.scrollHeight
          )
          
          return { index, hasOverflow }
        })
        .filter(({ hasOverflow }) => hasOverflow)
        .map(({ index }) => index)

      setLongDescriptions(longItems)
    }

    // Check after a short delay to ensure rendering is complete
    const timeoutId = setTimeout(checkTextOverflow, 100)

    // Recheck on window resize
    const handleResize = () => {
      clearTimeout(timeoutId)
      setTimeout(checkTextOverflow, 100)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
    }
  }, [timestamps])

  const toggleExpand = (index: number, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    setExpandedItems(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    )
  }
  return (
    <div className="grid gap-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2 px-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Key Moments</h2>
        <div className="flex gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20">
            <Shield className="h-3.5 w-3.5 text-green-400" />
            <span className="text-green-400/80 uppercase tracking-wider">Safe</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 rounded-full border border-red-500/20">
            <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
            <span className="text-red-400/80 uppercase tracking-wider">Danger</span>
          </div>
        </div>
      </div>
      <div className="grid gap-3">
        {timestamps.map((item, index) => (
          <Button
            key={index}
            variant="outline"
            className={`group w-full justify-start gap-3 h-auto py-4 px-4 transition-all duration-300 ${
              item.isDangerous 
                ? 'bg-red-950/20 border-red-900/40 hover:bg-red-950/30 hover:border-red-700/60 shadow-[0_0_15px_rgba(239,68,68,0.05)]' 
                : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60 hover:border-white/10'
            } text-left relative overflow-hidden rounded-2xl`}
            onClick={() => onTimestampClick(item.timestamp)}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 ${
              item.isDangerous
                ? 'bg-red-500 group-hover:bg-red-400 shadow-[2px_0_10px_rgba(239,68,68,0.3)]'
                : 'bg-green-500 group-hover:bg-green-400 shadow-[2px_0_10px_rgba(34,197,94,0.3)]'
            }`} />
            
            <div className="shrink-0 p-2 rounded-xl bg-black/20">
              {item.isDangerous ? (
                <ShieldAlert className="h-5 w-5 text-red-400 animate-pulse" />
              ) : (
                <Shield className="h-5 w-5 text-green-400" />
              )}
            </div>

            <div className="flex flex-col items-start w-full min-w-0 pr-2">
              <div className="flex items-center gap-3 w-full mb-1">
                <span className="font-mono text-sm sm:text-base font-bold text-white tracking-tighter bg-white/5 py-0.5 px-2 rounded-lg">{item.timestamp}</span>
                {item.isDangerous && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-widest">
                    ALARM
                  </span>
                )}
              </div>
              <div className="w-full">
                <div 
                  className={`relative text-xs sm:text-sm leading-relaxed transition-all duration-200 ${longDescriptions.includes(index) ? 'cursor-pointer' : ''}`}
                  onClick={(e: React.MouseEvent) => longDescriptions.includes(index) && toggleExpand(index, e)}
                >
                  <p 
                    ref={(el) => { textRefs.current[index] = el }}
                    className={`whitespace-pre-wrap break-words ${expandedItems.includes(index) ? '' : 'line-clamp-2'} ${
                    item.isDangerous ? 'text-red-100/90 font-medium' : 'text-zinc-400'
                  }`}>
                    {item.description}
                  </p>
                  {longDescriptions.includes(index) && (
                    <div 
                      role="button"
                      tabIndex={0}
                      className={`flex items-center gap-1 text-[10px] sm:text-xs mt-1.5 font-bold uppercase tracking-widest cursor-pointer ${item.isDangerous ? 'text-red-400 hover:text-red-300' : 'text-zinc-500 hover:text-zinc-300'} transition-colors`}
                    >
                      {expandedItems.includes(index) ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          Show more
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Button>
        ))}
        {timestamps.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 px-4 bg-zinc-900/20 border border-white/5 rounded-2xl border-dashed">
            <Clock className="h-8 w-8 text-zinc-700 mb-2" />
            <p className="text-zinc-500 text-sm italic">No events detected yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
