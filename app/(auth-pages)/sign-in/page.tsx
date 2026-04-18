import { signInAction } from "@/app/actions"
import { FormMessage, type Message } from "@/components/form-message"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams
  return (
    <div className="flex justify-center items-center min-h-screen w-full bg-background">
      <div className="w-full max-w-md px-4">
        <form className="flex flex-col w-full p-8 space-y-6 bg-card rounded-lg shadow-lg">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 bg-white/5 border border-white/10 rounded-xl p-3 shadow-2xl shadow-black/50">
              <img src="/image.png" alt="Suraksha Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-center">Sign in</h1>
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link className="text-primary font-medium underline" href="/sign-up">
              Sign up
            </Link>
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base">
                Email
              </Label>
              <Input name="email" id="email" placeholder="you@example.com" required className="text-base" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-base">
                  Password
                </Label>
                <Link className="text-sm text-primary underline" href="/forgot-password">
                  Forgot Password?
                </Link>
              </div>
              <Input
                type="password"
                name="password"
                id="password"
                placeholder="Your password"
                required
                className="text-base"
              />
            </div>
            <SubmitButton pendingText="Signing In..." formAction={signInAction} className="w-full text-base">
              Sign in
            </SubmitButton>
            <FormMessage message={searchParams} />
          </div>
        </form>
      </div>
    </div>
  )
}