# 🏥 Suraksha AI — Hospital Security Intelligence Hub

**"Protecting the ones who protect us."**

Suraksha AI is an enterprise-grade, medical-optimized surveillance ecosystem built to transform standard hospital CCTV networks into active, intelligent defense systems. Designed specifically for the high-stakes environment of healthcare, Suraksha AI solves the unique security challenges faced by doctors, staff, and patients 24/7.

---

## 🚀 The Mission
Medical professionals are under dual pressure: they must save lives while facing increasing risks of physical aggression and a global staffing crisis. **Suraksha AI** acts as a silent, digital guardian, automating the detection of threats so security teams can respond in seconds, not minutes.

## 🧠 Dual-Layer Neural Architecture
The platform is powered by a high-performance hybrid intelligence stack:
- **Layer 1 (Local/Edge)**: YOLOv11 for ultra-fast tracking + DeepFace for medical staff identity verification.
- **Layer 2 (Cloud Reasoning)**: Groq Llama 3.2 for live-feed reasoning + Gemini 1.5 Flash Adaptive Pool (19 nodes) for forensic evidence analysis.

## 🛡️ Core Capabilities
*   **🚨 Aggression Detection**: Real-time monitoring for violence against hospital staff.
*   **👶 Infant Security**: Perimeter monitoring for maternity wards and NICUs.
*   **🏃 Patient Safety**: Instant detection of falls and unattended emergencies.
*   **🔥 Thermal/Fire Analysis**: AI-powered smoke and fire pattern recognition.
*   **🔒 Zone Enforcement**: Protecting OTs, Pharmacies, and Lab restricted areas.

---

## ⚡ Deployment Instructions

### 1. Frontend (Next.js)
**Platform:** [Vercel](https://vercel.com)
1. Import your GitHub repository to Vercel.
2. Add the following environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_BACKEND_URL` (Pointer to your deployed Python API)

### 2. Backend (FastAPI / YOLOv11)
**Platform:** [Render.com](https://render.com) or [Railway.app](https://railway.app)
1. Create a new "Web Service" from your GitHub repo.
2. Set the Root Directory to `python_backend`.
3. **Build Command:** `pip install -r requirements.txt`
4. **Start Command:** `python live_feed_server.py`
5. Ensure the `HF_API_KEY` and `GROQ_API_KEY` are set in the environment variables.

---

## 🛠️ Technical Stack
- **Dashboard**: Next.js 15, TypeScript, Tailwind CSS, Framer Motion.
- **AI Core**: YOLOv11, DeepFace, Groq Vision, Gemini 1.5 Flash.
- **Data Engine**: Supabase (Auth, PostgreSQL, Storage Buckets).
- **Communication**: Telegram Bot API for emergency security dispatch.

---
© 2026 Suraksha AI Platform. All rights reserved. Built for Hospital Security.
