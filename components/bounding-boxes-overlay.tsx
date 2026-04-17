'use client'

import { useEffect, useState, useRef, memo } from 'react'
import type { BoundingBoxData } from '@/types'
import { getBoundingBoxData } from '@/lib/data'

interface BoundingBoxesOverlayProps {
  videoName: string
  currentTime: number
  fps?: number
  width: number
  height: number
}

// Memoize so it only re-renders when currentTime or dimensions change
export const BoundingBoxesOverlay = memo(function BoundingBoxesOverlay({
  videoName,
  currentTime,
  fps = 30,
  width,
  height,
}: BoundingBoxesOverlayProps) {
  const [boxesData, setBoxesData] = useState<BoundingBoxData | null>(null)
  const loadedForName = useRef<string>('')

  // Load bounding box data only once per videoName
  useEffect(() => {
    if (loadedForName.current === videoName) return
    loadedForName.current = videoName
    getBoundingBoxData(videoName).then(setBoxesData)
  }, [videoName])

  if (!boxesData) return null

  const frameNumber = Math.floor(currentTime * fps).toString()
  const frameData = boxesData.frames[frameNumber]
  const boxes = frameData?.boxes ?? []

  if (boxes.length === 0) return null

  const scaleX = width / boxesData.video_info.width
  const scaleY = height / boxesData.video_info.height

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {boxes.map((box, index) => {
        const [x1, y1, x2, y2] = box
        return (
          <div
            key={index}
            className="absolute border border-emerald-400/80 bg-emerald-400/10"
            style={{
              left: `${x1 * scaleX}px`,
              top: `${y1 * scaleY}px`,
              width: `${(x2 - x1) * scaleX}px`,
              height: `${(y2 - y1) * scaleY}px`,
              willChange: 'transform',
            }}
          />
        )
      })}
    </div>
  )
})
