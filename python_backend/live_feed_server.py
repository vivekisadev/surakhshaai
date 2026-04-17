import cv2
import numpy as np
import time
import requests
import os
import threading
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Try to load env config from the Next.js .env.local file
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env.local")
load_dotenv(dotenv_path=env_path)

HF_API_KEY = os.environ.get("HF_API_KEY", "")

# Initialise FastAPI
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("[INFO] Loading YOLO11 for ultra-fast local movement/person tracking...")
try:
    from ultralytics import YOLO
    # yolo11n is the nano model - runs instantly at 30+ FPS even on basic CPUs
    model = YOLO("yolo11n.pt") 
    HAS_YOLO = True
    print("[INFO] YOLO11 Loaded Successfully.")
except ImportError:
    HAS_YOLO = False
    print("[WARNING] ultralytics not installed. Tracking disabled. Install with: pip install ultralytics")

# =========================================================================
# Hugging Face Models - Specialized detection
# =========================================================================
HF_BASE = "https://api-inference.huggingface.co/models"
MODELS = {
    "harassment": f"{HF_BASE}/Falconsai/nsfw_image_classification",
    "emotion":    f"{HF_BASE}/dima806/facial_emotions_image_detection"
}

def call_hf_api(image_bytes, model_url):
    if not HF_API_KEY:
        return None
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    try:
        # 1.5 second timeout so the video doesn't freeze during heavy network requests
        response = requests.post(model_url, headers=headers, data=image_bytes, timeout=1.5)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        pass
    return None

# State tracking
last_hf_call = 0
HF_CALL_INTERVAL = 1.0 # 1 second between API calls to ensure buttery smooth video stream
current_alert = None
alert_timer = 0

def check_threat(image_bytes):
    global current_alert, alert_timer
    harass_res = call_hf_api(image_bytes, MODELS["harassment"])
    emot_res = call_hf_api(image_bytes, MODELS["emotion"])
    
    is_harassment = False
    if harass_res and isinstance(harass_res, list):
        for label in harass_res:
            if label["label"].lower() == "nsfw" and label["score"] > 0.50:
                is_harassment = True
                
    is_assault = False
    if emot_res and isinstance(emot_res, list):
        for label in emot_res:
            if label["label"].lower() in ["angry", "fear"] and label["score"] > 0.60:
                is_assault = True
    
    if is_harassment:
        current_alert = "CRITICAL: SEXUAL HARASSMENT DETECTED"
        alert_timer = time.time() + 4.0
        print(f"[ALERT] {current_alert}")
    elif is_assault:
        current_alert = "CRITICAL: ASSAULT / AGGRESSION DETECTED"
        alert_timer = time.time() + 4.0
        print(f"[ALERT] {current_alert}")

def process_frame(frame):
    global last_hf_call, current_alert, alert_timer
    
    boxes = []
    
    # 1. Ultra-fast local movement & person tracking using YOLO (GPU/CPU)
    if HAS_YOLO:
        results = model(frame, verbose=False)
        for r in results:
            for box in r.boxes:
                cls = int(box.cls[0])
                label_name = model.names[cls]
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                
                # If it's a person, run advanced tracking & checks
                if label_name == 'person':
                    boxes.append((x1, y1, x2, y2, conf))
                    
                    # --- LOCAL FALL DETECTION HEURISTIC ---
                    # If a person's bounding box is much wider than it is tall, they might be lying down/fallen
                    width = x2 - x1
                    height = y2 - y1
                    if width > height * 1.5 and conf > 0.60:
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 165, 255), 3) # Orange box
                        cv2.putText(frame, f"FALL DETECTED {conf:.2f}", (x1, max(15, y1-10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
                        current_alert = "CRITICAL: PATIENT FALL DETECTED"
                        alert_timer = time.time() + 4.0
                    else:
                        # Normal person
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 100), 2)
                        cv2.putText(frame, f"Person {conf:.2f}", (x1, max(15, y1-10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 100), 2)
                
                # Detect other important objects (knives, backpacks, cell phones)
                elif label_name in ['knife', 'backpack', 'cell phone', 'laptop', 'handbag']:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)
                    cv2.putText(frame, f"{label_name.upper()} {conf:.2f}", (x1, max(15, y1-10)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)

    # 2. Advanced Threat Detection via Hugging Face
    current_time = time.time()
    
    # Intelligent Filtering: Only trigger heavy APIs if multiple people are in the frame
    # (Because assault and harassment typically require >1 person interacting)
    if len(boxes) >= 2 and (current_time - last_hf_call) > HF_CALL_INTERVAL:
        ret, buffer = cv2.imencode('.jpg', frame)
        if ret:
            image_bytes = buffer.tobytes()
            print("[INFO] Interaction potential detected (2+ subjects). Running threat analysis...")
            last_hf_call = current_time
            threading.Thread(target=check_threat, args=(image_bytes,), daemon=True).start()

    # 3. Draw active threat alerts for a few seconds immediately to stream
    if current_alert and current_time < alert_timer:
        # Flash the whole border red
        cv2.rectangle(frame, (0, 0), (frame.shape[1]-1, frame.shape[0]-1), (0, 0, 255), 10)
        # Text Header background
        cv2.rectangle(frame, (10, 10), (frame.shape[1]-10, 50), (0, 0, 255), -1)
        # Alert font
        cv2.putText(frame, current_alert, (30, 38), 
                    cv2.FONT_HERSHEY_DUPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)

    return frame

def generate_frames():
    # Attempt to open standard webcam. 
    # Use 1, 2, or 3 for external cameras (like Camo Studio). 0 is usually the built-in laptop webcam.
    cap = cv2.VideoCapture(1)
    cap.set(cv2.CAP_PROP_FPS, 60)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    
    if not cap.isOpened():
        print("[ERROR] Could not open webcam.")
        placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(placeholder, "CAMERA UNAVAILABLE", (150, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 3)
        while True:
            ret, buffer = cv2.imencode('.jpg', placeholder)
            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(1)
        return

    # To ensure high frame rate, we process the frames directly
    while True:
        success, frame = cap.read()
        if not success:
            time.sleep(0.01)
            continue
            
        frame = cv2.resize(frame, (800, 600))
        frame = process_frame(frame)
        
        ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        if not ret: continue
            
        frame_bytes = buffer.tobytes()
        
        # Streams the frame immediately to browser over HTTP MJPEG protocol
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/")
def health_check():
    return {"status": "Suraksha AI Python Backend Running", "version": "1.0.0"}

if __name__ == '__main__':
    import uvicorn
    print("\n" + "="*60)
    print(" SURAKSHA AI REAL-TIME INFERENCE SERVER STARTING")
    print("="*60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
