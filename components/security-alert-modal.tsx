import { useState, useEffect } from "react"
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface SecurityAlertModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAlertComplete: () => void
  eventTitle?: string
  eventDescription?: string
  eventLocation?: string
}

export function SecurityAlertModal({
  open,
  onOpenChange,
  onAlertComplete,
  eventTitle = "Security Alert",
  eventDescription = "Suspicious activity detected",
  eventLocation = "Unknown Location",
}: SecurityAlertModalProps) {
  const [status, setStatus] = useState<"calling" | "alerted" | "failed">("calling")
  const [sentChannels, setSentChannels] = useState<string[]>([])

  useEffect(() => {
    if (open && status === "calling") {
      sendRealAlerts()
    }
  }, [open])

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStatus("calling")
        setSentChannels([])
      }, 300)
    }
  }, [open])

  const sendRealAlerts = async () => {
    const timestamp = new Date().toLocaleString()
    const payload = {
      title: eventTitle,
      description: `📍 Location: ${eventLocation}\n\n${eventDescription}\n\nTime: ${timestamp}`,
      timestamp,
    }

    const channels: string[] = []
    let anySuccess = false

    // Fire Telegram, Email, and WhatsApp simultaneously
    const [telegramResult, emailResult, whatsappResult] = await Promise.allSettled([
      fetch("/api/send-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `🚨 ${eventTitle}`,
          description: `Location: ${eventLocation}\n\n${eventDescription}`,
        }),
      }),
      fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    ])

    if (telegramResult.status === "fulfilled" && telegramResult.value.ok) {
      channels.push("📱 Telegram")
      anySuccess = true
    }

    if (emailResult.status === "fulfilled" && emailResult.value.ok) {
      channels.push("📧 Email")
      anySuccess = true
    }

    if (whatsappResult.status === "fulfilled" && whatsappResult.value.ok) {
      channels.push("💬 WhatsApp")
      anySuccess = true
    }

    setSentChannels(channels)
    setStatus(anySuccess ? "alerted" : "failed")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">
            {status === "calling"
              ? "Alerting Hospital Security..."
              : status === "alerted"
                ? "Security Team Notified! ✅"
                : "Alert Partially Failed ⚠️"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 gap-4">
          {status === "calling" ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <p className="text-sm text-gray-500 text-center">
                Dispatching hospital security — notifying via Telegram, Email & WhatsApp...
              </p>
            </>
          ) : status === "alerted" ? (
            <>
              <ShieldCheck className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Alert sent successfully!
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Notified via: {sentChannels.join(", ")}
                </p>
              </div>
            </>
          ) : (
            <>
              <ShieldAlert className="h-12 w-12 text-red-500" />
              <p className="text-sm text-red-500 text-center">
                Failed to send alerts. Check your Telegram, Email & WhatsApp configuration.
              </p>
            </>
          )}

          {(status === "alerted" || status === "failed") && (
            <div className="w-full mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400">
              <p className="font-semibold mb-1">Incident Details:</p>
              <p>📍 {eventLocation}</p>
              <p>⚠️ {eventTitle}</p>
              <p className="mt-1 text-gray-400">{eventDescription}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {(status === "alerted" || status === "failed") && (
            <button
              onClick={() => {
                onAlertComplete()
                onOpenChange(false)
              }}
              className="w-full rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Close
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
