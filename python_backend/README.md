# Suraksha AI — Real-Time Python Inference Server

This standalone Python backend replaces the heavy browser-based AI detection. By running the inference directly on your machine using Python and OpenCV, you get completely lag-free 30+ FPS video streaming and highly accurate detection.

## Features
- **Ultra-Fast Movement & Person Tracking:** Uses `YOLOv8` locally to track people perfectly without any lag.
- **Intelligent Threat Detection:** Only triggers Hugging Face API checks for **Harassment or Assault** when it detects multiple people interacting. This prevents the video from freezing and saves API tokens.
- **MJPEG Streaming:** Bypasses Next.js and the browser entirely, streaming raw JPEG frames through FastAPI directly to the frontend.

## Installation

1. Navigate to the `python_backend` folder:
   ```bash
   cd python_backend
   ```
2. Create and activate a Virtual Environment (Recommended):
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install the high-performance requirements:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

Start the Python server with:
```bash
python live_feed_server.py
```
> The first time you run this, it will take about 10-20 seconds to download the YOLOv8 model file (`yolov8n.pt`).

## Testing it locally
Once running, you can test it completely independently of the Next.js app! 
Just open your browser and go straight to: 
http://localhost:8000/video_feed

You should see your webcam instantly loading with green bounding boxes tracking you securely!

## Integrating with Next.js Frontend
Once this Python script is running, open your Next.js application and wherever you have your `<video>` component for the live feed, you can just replace it with this single line:

```tsx
<img src="http://localhost:8000/video_feed" alt="Suraksha Live AI Feed" className="w-full h-full object-cover" />
```
Because the Python server uses the MJPEG protocol, standard `<img>` tags natively render 30FPS streaming video without needing complex WebRTC or WebSockets!
