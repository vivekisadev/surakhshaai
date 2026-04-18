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
      <div className="flex items-center justify-center w-10 h-10 bg-white/5 border border-white/10 rounded-lg group-hover:bg-white/10 group-hover:border-white/20 transition-all shadow-lg shadow-black/50 p-1">
        <img src="/image.png" alt="Suraksha Logo" className="w-full h-full object-contain" />
      </div>
    </Link>
  )
}
