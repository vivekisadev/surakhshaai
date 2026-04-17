'use client'

import { useState } from 'react'

export default function TestTelegramPage() {
  const [status, setStatus] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [includeImage, setIncludeImage] = useState(true)

  // Sample test image (1x1 red pixel in base64)
  const sampleImageBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB/9k='

  const sendTestNotification = async () => {
    setIsLoading(true)
    setStatus('Sending...')

    try {
      const payload: {
        title: string
        description: string
        timestamp: string
        imageBase64?: string
      } = {
        title: '🧪 Test Alert - Fighting Detected',
        description: 'This is a TEST notification from HawkWatch. A physical altercation was detected in the monitored area. Security personnel should investigate immediately.',
        timestamp: new Date().toLocaleString(),
      }

      if (includeImage) {
        payload.imageBase64 = sampleImageBase64
      }

      const response = await fetch('/api/send-telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('✅ Telegram notification sent successfully! Check your Telegram.')
      } else {
        setStatus(`❌ Error: ${data.error || 'Failed to send notification'}`)
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const sendDangerousEventTest = async () => {
    setIsLoading(true)
    setStatus('Sending dangerous event notification...')

    try {
      const payload = {
        title: '⚠️ Dangerous Activity Detected',
        description: 'At 02:45, the following dangerous activity was detected: Person seen attacking another individual near the entrance. Immediate security response required.',
        timestamp: new Date().toLocaleString(),
        imageBase64: includeImage ? sampleImageBase64 : undefined,
      }

      const response = await fetch('/api/send-telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('✅ Dangerous event notification sent! Check your Telegram.')
      } else {
        setStatus(`❌ Error: ${data.error || 'Failed to send notification'}`)
      }
    } catch (error) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🔔 Test Telegram Notifications</h1>
        <p className="text-gray-400 mb-8">
          Test the Telegram notification system for HawkWatch alerts.
        </p>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuration Status</h2>
          <p className="text-gray-300 text-sm mb-4">
            Make sure you have configured the following environment variables:
          </p>
          <ul className="list-disc list-inside text-gray-400 text-sm space-y-1">
            <li><code className="bg-gray-700 px-1 rounded">TELEGRAM_BOT_TOKEN</code> - Your bot token from @BotFather</li>
            <li><code className="bg-gray-700 px-1 rounded">TELEGRAM_CHAT_ID</code> - Your chat ID from @userinfobot</li>
          </ul>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Options</h2>
          
          <label className="flex items-center gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={includeImage}
              onChange={(e) => setIncludeImage(e.target.checked)}
              className="w-5 h-5 rounded bg-gray-700 border-gray-600"
            />
            <span>Include test image with notification</span>
          </label>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={sendTestNotification}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Sending...' : '📤 Send Test Notification'}
            </button>

            <button
              onClick={sendDangerousEventTest}
              disabled={isLoading}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Sending...' : '🚨 Send Danger Alert'}
            </button>
          </div>
        </div>

        {status && (
          <div className={`p-4 rounded-lg ${
            status.includes('✅') ? 'bg-green-900/50 border border-green-500' :
            status.includes('❌') ? 'bg-red-900/50 border border-red-500' :
            'bg-blue-900/50 border border-blue-500'
          }`}>
            <p className="text-sm">{status}</p>
          </div>
        )}

        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📱 Setup Instructions</h2>
          <ol className="list-decimal list-inside text-gray-300 space-y-3 text-sm">
            <li>
              <strong>Create a Telegram Bot:</strong>
              <ul className="list-disc list-inside ml-6 mt-1 text-gray-400">
                <li>Open Telegram and search for <code className="bg-gray-700 px-1 rounded">@BotFather</code></li>
                <li>Send <code className="bg-gray-700 px-1 rounded">/newbot</code> and follow the prompts</li>
                <li>Copy the bot token you receive</li>
              </ul>
            </li>
            <li>
              <strong>Get Your Chat ID:</strong>
              <ul className="list-disc list-inside ml-6 mt-1 text-gray-400">
                <li>Search for <code className="bg-gray-700 px-1 rounded">@userinfobot</code> on Telegram</li>
                <li>Send any message to get your chat ID</li>
                <li>For group chats, add the bot to the group and use the group&apos;s chat ID</li>
              </ul>
            </li>
            <li>
              <strong>Configure Environment:</strong>
              <ul className="list-disc list-inside ml-6 mt-1 text-gray-400">
                <li>Add <code className="bg-gray-700 px-1 rounded">TELEGRAM_BOT_TOKEN=your_token</code> to <code className="bg-gray-700 px-1 rounded">.env</code></li>
                <li>Add <code className="bg-gray-700 px-1 rounded">TELEGRAM_CHAT_ID=your_chat_id</code> to <code className="bg-gray-700 px-1 rounded">.env</code></li>
                <li>Restart the development server</li>
              </ul>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
