# HawkWatch Mobile App - Development Plan

## 🎯 Core Features (MVP)
1. **Smart Notifications** - Real-time alerts for dangerous events
2. **Live Camera Analysis** - Phone camera as portable surveillance node  
3. **Protected Video Footages** - View saved videos with timeline analysis
4. **Authentication** - Same Supabase auth as web app

## 📱 App Structure

### Stack
- **Framework**: Expo + React Native 
- **Styling**: NativeWind (Tailwind for RN)
- **Auth**: @supabase/supabase-js 
- **AI**: @tensorflow/tfjs-react-native
- **Video**: expo-av
- **Camera**: expo-camera  
- **Notifications**: expo-notifications

### Screen Architecture
```
📱 HawkWatch Mobile
├── 🔐 Auth Stack
│   ├── LoginScreen (reuse signIn logic)
│   └── SignUpScreen (reuse signUp logic)
├── 🏠 Main Tabs  
│   ├── 📹 Live Analysis
│   │   ├── Camera feed
│   │   ├── Real-time TensorFlow detection
│   │   └── Auto-alert generation
│   ├── 📚 Footages
│   │   ├── Video list (from Supabase)
│   │   ├── Video player (expo-av)
│   │   └── Timeline/events display
│   ├── 🔔 Notifications
│   │   ├── Alert history
│   │   └── Notification settings
│   └── ⚙️ Profile
│       ├── User info
│       └── Settings/logout
```

## 🔄 Component Reuse Strategy

### Direct Adaptations
- **TimestampList** → Mobile timeline component
- **VideoPlayer** logic → expo-av integration
- **ChatInterface** patterns → Mobile chat UI
- **Auth actions** → Same Supabase calls
- **detectEvents** → Same Gemini API calls

### Mobile-Specific Components  
- **CameraAnalyzer** - TensorFlow.js + expo-camera
- **PushNotificationHandler** - expo-notifications
- **MobileVideoPlayer** - expo-av wrapper
- **TabNavigator** - react-navigation

## 🔔 Push Notifications Flow

### Backend Extension (Supabase Edge Function)
```typescript
// Extend existing email notification to include push
async function sendAlert(event: DangerousEvent) {
  // Current: Send email via Resend
  await sendEmailAlert(event)
  
  // New: Send push notification
  await sendPushNotification({
    title: "⚠️ Security Alert",
    body: `${event.type} detected at ${event.timestamp}`,
    data: { eventId: event.id, cameraId: event.cameraId }
  })
}
```

### Mobile Implementation
```typescript
// Register device for notifications
await registerForPushNotificationsAsync()

// Handle incoming notifications
Notifications.addNotificationReceivedListener(notification => {
  // Show alert, update UI, navigate to relevant footage
})
```

## 📹 Mobile Camera Analysis

### TensorFlow.js Integration
```typescript
// Port existing detection logic to mobile
import { loadTensorFlowModules } from './tensorflow-loader' // Reuse!
import { detectEvents } from './gemini-api' // Reuse!

const MobileCameraAnalyzer = () => {
  const [camera, setCamera] = useState(null)
  const [models, setModels] = useState(null)
  
  // Reuse exact same model loading logic
  useEffect(() => {
    loadTensorFlowModels().then(setModels)
  }, [])
  
  // Capture frame every 3 seconds, analyze with Gemini
  const analyzeFrame = async () => {
    const frame = await camera.takePictureAsync()
    const result = await detectEvents(frame.uri) // Same API!
    if (result.events.length > 0) {
      triggerNotification(result.events[0])
    }
  }
}
```

## 🎨 UI/UX Design (Same as Web)

### Color Scheme
- Background: `bg-black` 
- Text: `text-white`
- Accents: Purple/pink gradients
- Components: Glass morphism style

### Typography
- Headers: `text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]`
- Body: `text-zinc-400`
- Same HawkWatch logo and branding

### Layout Patterns
- Same card-based design
- Same button styles and interactions
- Same loading states and progress bars

## 🔧 Development Phases

### Phase 1: Basic Mobile Shell (2-3 days)
- [x] Expo project setup
- [x] Navigation structure  
- [x] Supabase auth integration
- [x] Basic UI components (Button, Input, etc.)

### Phase 2: Core Features (3-4 days)  
- [x] Push notifications setup
- [x] Camera integration with TensorFlow.js
- [x] Video footages screen
- [x] Notification history

### Phase 3: Polish & Testing (1-2 days)
- [x] UI/UX refinements 
- [x] Error handling
- [x] Performance optimization
- [x] Testing on device

## 📦 File Structure
```
hawkwatch-mobile/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── signup.tsx  
│   └── (tabs)/
│       ├── live.tsx
│       ├── footages.tsx
│       ├── notifications.tsx
│       └── profile.tsx
├── components/
│   ├── ui/ (port from web)
│   ├── CameraAnalyzer.tsx
│   ├── VideoPlayer.tsx
│   └── TimestampList.tsx
├── lib/
│   ├── supabase.ts (same config)
│   ├── tensorflow-loader.ts (adapted)
│   └── notifications.ts
└── assets/
    └── HawkWatchLogo.png (same logo)
```

## 🚀 Deployment
- **Development**: Expo Go app
- **Production**: EAS Build → App Store/Google Play
- **Backend**: Same Vercel + Supabase (no changes needed)

## ✅ Success Metrics
- Push notifications work reliably  
- Camera analysis detects events accurately
- Video playback smooth with timeline
- UI matches web app design language
- Auth flow seamless between web/mobile