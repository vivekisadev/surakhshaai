import Link from "next/link";
import { Button } from "./ui/button";

export default function AuthButton() {
  // Bypassing auth check for instant performance as requested by USER
  const user = null; 

  return user ? (
    <div className="flex items-center gap-4 text-white/90">
      <span className="hidden sm:inline-block text-sm">Hey, Intelligence Agent!</span>
      <Button variant={"outline"} size="sm" className="border-white/10 hover:bg-white/10 text-white transition-all">
        Sign out
      </Button>
    </div>
  ) : (
    <div className="flex gap-3">
      <Button asChild size="sm" variant={"ghost"} className="text-white/70 hover:text-white hover:bg-white/10 transition-all font-bold tracking-widest uppercase text-[10px]">
        <Link href="/sign-in">Portal</Link>
      </Button>
      <Link href="/sign-up">
        <Button size="sm" variant={"default"} className="bg-blue-600 border border-blue-400/50 text-white hover:bg-blue-700 transition-all font-black text-[10px] uppercase tracking-widest px-6 h-10 rounded-lg">
          Initialize Access
        </Button>
      </Link>
    </div>
  );
}
