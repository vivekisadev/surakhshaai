"use client"

import Link from "next/link"
import { Video, PlaySquare, FolderOpen, BarChart2, Menu, Zap, Activity, ClipboardList } from "lucide-react"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePathname } from "next/navigation"

export function HeaderNav() {
  const pathname = usePathname();
  const navItems = [
    { href: "/surveillance", label: "Monitor", icon: BarChart2 },
    { href: "/pre-analyzer", label: "Analyze", icon: Zap, badge: "AI" },
    { href: "/upload", label: "Upload", icon: Video },
    { href: "/realtime", label: "Live Feed", icon: PlaySquare },
    { href: "/library", label: "Incidents", icon: FolderOpen },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={`
                flex items-center gap-2 px-3 py-1.5 transition-all duration-200 group relative
                ${isActive ? 'text-blue-400 bg-blue-500/8' : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50'}
              `}>
                <item.icon className={`h-3.5 w-3.5 ${isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-80'}`} />
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] hidden lg:inline">{item.label}</span>
                {item.badge && (
                  <span className="px-1 py-0.5 bg-blue-500/10 text-blue-400 text-[8px] font-mono uppercase border border-blue-500/20">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                   <div className="absolute inset-y-0 left-0 w-[2px] bg-blue-500" />
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Mobile Navigation */}
      <div className="flex md:hidden items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-200">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-black border border-neutral-800 text-neutral-400 p-1">
            {navItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild className="focus:bg-neutral-800 focus:text-neutral-100 p-0">
                <Link href={item.href} className="flex items-center gap-3 w-full py-2.5 px-3">
                  <item.icon className="h-4 w-4 opacity-50" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest">{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[8px] font-mono uppercase">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
