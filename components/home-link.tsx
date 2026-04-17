'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield } from 'lucide-react'

export default function HomeLink() {
  const router = useRouter()

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    router.push(user ? '/protected' : '/')
  }

  return (
    <Link 
      href="/" 
      onClick={handleClick}
      className="flex items-center gap-2 group"
    >
      <div className="flex items-center justify-center w-7 h-7 bg-blue-600/20 border border-blue-500/40 rounded-sm group-hover:bg-blue-600/30 transition-colors">
        <Shield className="w-4 h-4 text-blue-400" />
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-sm font-bold tracking-tight text-neutral-100 font-mono">SURAKSHA</span>
        <span className="text-sm font-bold tracking-tight text-blue-400 font-mono">AI</span>
      </div>
    </Link>
  )
}
