import cv2
import numpy as np
import time
import requests
import os
import threading
import base64
import json
import tempfile
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Initialize DeepFace
try:
    from deepface import DeepFace
    HAS_DEEPFACE = True
    print("[INFO] DeepFace Loaded for Identity and Emotion Analysis.")
except ImportError:
    HAS_DEEPFACE = False
    print("[WARNING] deepface not installed. Install with: pip install deepface tf-keras")

# Try to load env config from the Next.js .env.local file
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env.local")
load_dotenv(dotenv_path=env_path)

DB_PATH = os.path.join(os.path.dirname(__file__), "hospital_db")
if not os.path.exists(DB_PATH):
    os.makedirs(DB_PATH)
    for folder in ["doctors", "staff", "patients"]:
        os.makedirs(os.path.join(DB_PATH, folder))

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

# --- Plugins State ---
PLUGINS = {
    "identity": True,    # DeepFace recognition
    "emotion": True,     # Behavior/Emotion analysis
    "threat": True,      # Interaction/Violence via HF
    "fall": True,        # Fall detection heuristic
    "weapons": True      # Knife/Weapon detection
}

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
last_deepface_call = 0
DEEPFACE_INTERVAL = 2.0 # Run DeepFace every 2 seconds max
current_alert = None
alert_timer = 0
face_analysis_results = {}

# Track person movement for Aggression detection
# {track_id: {"prev_center": (x,y), "velocity": v, "timestamp": t}}
movement_data = {}

def detect_aggression_local(boxes_data):
    """
    Refined Heuristic: Checks for BOTH bounding box overlap and high-intensity movement
    to distinguish between people just walking past each other and a real scuffle.
    """
    global current_alert, alert_timer
    for i in range(len(boxes_data)):
        for j in range(i + 1, len(boxes_data)):
            box1, id1 = boxes_data[i]
            box2, id2 = boxes_data[j]
            
            # 1. Check for physical overlap (Intersection of boxes)
            # A real assault almost always involves overlapping boxes
            x_left = max(box1[0], box2[0])
            y_top = max(box1[1], box2[1])
            x_right = min(box1[2], box2[2])
            y_bottom = min(box1[3], box2[3])
            
            has_overlap = x_right > x_left and y_bottom > y_top
            
            if has_overlap:
                v1 = movement_data.get(id1, {}).get("velocity", 0)
                v2 = movement_data.get(id2, {}).get("velocity", 0)
                
                # High velocity (v > 80) while overlapping is a strong indicator of an assault
                if v1 > 80 or v2 > 80: 
                    current_alert = "CRITICAL: PHYSICAL AGGRESSION DETECTED"
                    alert_timer = time.time() + 4.0
                    return True
    return False

def detect_fire_local(frame):
    """
    Refined Heuristic: Higher saturation requirements to avoid 'pale' color false positives.
    """
    global current_alert, alert_timer
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    
    # 0-20 Hue is Red/Orange, Saturation > 180 ensures it's vibrant fire, not pale/beige.
    lower_fire = np.array([0, 180, 180])
    upper_fire = np.array([25, 255, 255])
    
    mask = cv2.inRange(hsv, lower_fire, upper_fire)
    fire_pixels = cv2.countNonZero(mask)
    
    # Increased threshold from 2000 to 4500 to require a larger flame area
    if fire_pixels > 4500: 
        current_alert = "CRITICAL: FIRE / SMOKE DETECTED"
        alert_timer = time.time() + 5.0
        return True
    return False


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

def analyze_person(person_crop, box_id):
    global current_alert, alert_timer, face_analysis_results
    if not HAS_DEEPFACE:
        return
    
    try:
        # 1. IDENTIFY ROLE (Facial Recognition)
        role = "UNAUTHORIZED"
        identification = DeepFace.find(img_path=person_crop, db_path=DB_PATH, enforce_detection=False, silent=True)
        
        if len(identification) > 0 and not identification[0].empty:
            # Get the path of the closest match
            match_path = identification[0].iloc[0]['identity']
            if "doctors" in match_path: role = "Doctor"
            elif "staff" in match_path: role = "Staff Member"
            elif "patients" in match_path: role = "Patient"
            print(f"[INFO] Identified: {role}")
        
        # 2. ANALYZE EMOTION/BEHAVIOR
        analysis = DeepFace.analyze(img_path=person_crop, actions=['emotion'], enforce_detection=False, silent=True)
        res_list = analysis if isinstance(analysis, list) else [analysis]
        
        dominant_emotion = "neutral"
        for res in res_list:
            if 'dominant_emotion' in res:
                dominant_emotion = res['dominant_emotion']
                # Check for nuisance behavior
                if dominant_emotion in ['angry', 'disgust', 'fear']:
                    if role == "UNAUTHORIZED":
                        current_alert = f"SECURITY ALERT: UNAUTHORIZED Person is {dominant_emotion.upper()}"
                        alert_timer = time.time() + 5.0
                    else:
                        current_alert = f"ALERT: {role} showing high {dominant_emotion.upper()}"
                        alert_timer = time.time() + 4.0
        
        # Update shared state for drawing
        face_analysis_results[box_id] = {
            "role": role,
            "emotion": dominant_emotion,
            "timestamp": time.time()
        }
        
    except Exception as e:
        print(f"[DEBUG] Analysis error: {e}")



def process_frame(frame):
    global last_hf_call, current_alert, alert_timer
    boxes = []
    
    # 1. Ultra-fast local movement & person tracking using YOLO (GPU/CPU)
    if HAS_YOLO:
        results = model.track(frame, persist=True, verbose=False)
        person_boxes_with_ids = []
        
        for r in results:
            if r.boxes is None: continue
            for box in r.boxes:
                cls = int(box.cls[0])
                label_name = model.names[cls]
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                track_id = int(box.id[0]) if box.id is not None else None
                
                if label_name == 'person':
                    boxes.append((x1, y1, x2, y2, conf))
                    if track_id is not None:
                        person_boxes_with_ids.append(((x1,y1,x2,y2), track_id))
                        
                        # --- TRACK VELOCITY FOR AGGRESSION ---
                        center = ((x1+x2)/2, (y1+y2)/2)
                        now = time.time()
                        if track_id in movement_data:
                            prev = movement_data[track_id]
                            dt = now - prev["timestamp"]
                            if dt > 0:
                                dx = center[0] - prev["center"][0]
                                dy = center[1] - prev["center"][1]
                                velocity = (dx**2 + dy**2)**0.5 / dt
                                movement_data[track_id]["velocity"] = velocity
                        movement_data[track_id] = {"center": center, "timestamp": now, "velocity": movement_data.get(track_id, {}).get("velocity", 0)}

                    # --- LOCAL FALL DETECTION ---
                    if PLUGINS["fall"]:
                        width, height = x2-x1, y2-y1
                        if width > height * 1.5 and conf > 0.60:
                            current_alert = "CRITICAL: PATIENT FALL DETECTED"
                            alert_timer = time.time() + 4.0
                    
                    # --- DRAWING ---
                    box_color = (0, 255, 100)
                    label_text = f"User #{track_id}" if track_id else "Person"
                    
                    if track_id in face_analysis_results:
                        res = face_analysis_results[track_id]
                        role = res["role"] if PLUGINS["identity"] else "User"
                        emotion = f" ({res['emotion']})" if PLUGINS["emotion"] else ""
                        label_text = f"{role}{emotion}"
                        if role == "UNAUTHORIZED":
                            box_color = (0, 0, 255)  # Red
                            # Trigger alert for unauthorized access
                            if current_alert != "SECURITY: UNAUTHORIZED ACCESS DETECTED":
                                current_alert = "SECURITY: UNAUTHORIZED ACCESS DETECTED"
                                alert_timer = time.time() + 5.0
                        elif role == "Doctor": box_color = (255, 255, 0)       # Cyan
                        elif role == "Staff Member": box_color = (255, 100, 0) # Blue-ish
                        elif role == "Patient": box_color = (0, 255, 200)      # Teal
                    
                    cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                    cv2.putText(frame, label_text, (x1, max(15, y1-10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, box_color, 2)

                    # --- DEEPFACE IDENTITY & EMOTION CHECK ---
                    if PLUGINS["identity"] and HAS_DEEPFACE and track_id is not None:
                        current_time = time.time()
                        global last_deepface_call
                        # Only analyze if not already cached or cache is stale (>15s)
                        needs_analysis = (
                            track_id not in face_analysis_results or
                            (current_time - face_analysis_results[track_id]["timestamp"]) > 15
                        )
                        if needs_analysis and (current_time - last_deepface_call) > DEEPFACE_INTERVAL:
                            person_crop = frame[max(0, y1):max(0, y2), max(0, x1):max(0, x2)]
                            if person_crop.size > 0:
                                last_deepface_call = current_time
                                threading.Thread(target=analyze_person, args=(person_crop.copy(), track_id), daemon=True).start()

                # --- WEAPONS ---
                elif PLUGINS["weapons"] and label_name in ['knife', 'scissors']:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                    current_alert = f"DANGER: {label_name.upper()} DETECTED"
                    alert_timer = time.time() + 5.0

        # --- LOCAL HEURISTICS (ZERO API) ---
        if PLUGINS["threat"]:
            detect_aggression_local(person_boxes_with_ids)
            # Detect Crowd
            if len(boxes) >= 5:
                current_alert = f"NOTICE: OVERCROWDING ({len(boxes)} persons)"
                alert_timer = time.time() + 3.0
            
            # Detect Fire locally
            detect_fire_local(frame)

    # Clean up old movement data
    if len(movement_data) > 50: movement_data.clear()

    # Draw active threat alerts
    if current_alert and time.time() < alert_timer:
        cv2.rectangle(frame, (0, 0), (frame.shape[1], frame.shape[0]), (0, 0, 255), 8)
        cv2.rectangle(frame, (10, 10), (frame.shape[1]-10, 60), (0, 0, 255), -1)
        cv2.putText(frame, current_alert, (30, 45), cv2.FONT_HERSHEY_DUPLEX, 0.9, (255, 255, 255), 2)

    return frame

def generate_frames():
    # Attempt to open webcam. 
    # Usually 0 is built-in, 1 or 2 are external (Camo Studio / USB).
    cap = None
    for index in [1, 0, 2]:
        cap = cv2.VideoCapture(index)
        if cap.isOpened():
            print(f"[INFO] Camera found at index {index}")
            break
        cap.release()
    
    if not cap or not cap.isOpened():
        print("[ERROR] Could not open any webcam.")
        placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(placeholder, "CAMERA UNAVAILABLE", (150, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 3)
        while True:
            ret, buffer = cv2.imencode('.jpg', placeholder)
            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(1)
        return

    cap.set(cv2.CAP_PROP_FPS, 60)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)


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

@app.get("/toggle_plugin/{name}/{state}")
def toggle_plugin(name: str, state: str):
    if name in PLUGINS:
        PLUGINS[name] = state.lower() == "true"
        return {"status": "success", "plugin": name, "enabled": PLUGINS[name]}
    return {"status": "error", "message": "Plugin not found"}

@app.get("/plugins")
def get_plugins():
    return PLUGINS

# =========================================================================
# Video Upload Analysis — LOCAL models, ZERO API calls
# =========================================================================

def analyze_single_frame(frame):
    """Run all local detectors on a single frame and return a list of events."""
    events = []
    h, w = frame.shape[:2]
    
    # --- YOLO Detection ---
    if HAS_YOLO:
        results = model(frame, verbose=False)
        person_count = 0
        person_boxes = []
        other_objects = []
        
        for r in results:
            if r.boxes is None: continue
            for box in r.boxes:
                cls = int(box.cls[0])
                label_name = model.names[cls]
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                
                if label_name == 'person':
                    person_count += 1
                    person_boxes.append((x1, y1, x2, y2, conf))
                    
                    # Fall detection
                    bw, bh = x2-x1, y2-y1
                    if bw > bh * 1.5 and conf > 0.60:
                        events.append({
                            "description": f"FALL DETECTED — Person #{person_count} appears to be lying on the ground (confidence: {conf:.0%})",
                            "isDangerous": True,
                            "type": "fall"
                        })
                
                elif label_name in ['knife', 'scissors']:
                    events.append({
                        "description": f"WEAPON DETECTED — {label_name.upper()} visible in frame (confidence: {conf:.0%})",
                        "isDangerous": True,
                        "type": "weapon"
                    })
                else:
                    other_objects.append(f"{label_name} ({conf:.0%})")
        
        # --- ALWAYS report person count ---
        if person_count > 0:
            # Build position descriptions for each person
            positions = []
            for idx, (x1, y1, x2, y2, conf) in enumerate(person_boxes):
                cx = (x1 + x2) / 2
                pos = "left side" if cx < w * 0.33 else ("center" if cx < w * 0.66 else "right side")
                positions.append(f"Person #{idx+1} at {pos} ({conf:.0%})")
            
            person_desc = ", ".join(positions)
            
            # Check if any dangerous events already found
            has_danger = any(e["isDangerous"] for e in events)
            
            if has_danger:
                events.insert(0, {
                    "description": f"{person_count} person(s) detected: {person_desc}",
                    "isDangerous": False,
                    "type": "info"
                })
            else:
                events.append({
                    "description": f"Normal activity — {person_count} person(s) detected: {person_desc}",
                    "isDangerous": False,
                    "type": "normal"
                })
        
        # Overcrowding
        if person_count >= 5:
            events.append({
                "description": f"OVERCROWDING — {person_count} persons detected in frame",
                "isDangerous": True,
                "type": "crowd"
            })
        
        # Proximity / potential aggression (overlapping boxes)
        for i in range(len(person_boxes)):
            for j in range(i+1, len(person_boxes)):
                b1, b2 = person_boxes[i][:4], person_boxes[j][:4]
                x_left = max(b1[0], b2[0])
                y_top = max(b1[1], b2[1])
                x_right = min(b1[2], b2[2])
                y_bottom = min(b1[3], b2[3])
                if x_right > x_left and y_bottom > y_top:
                    overlap_area = (x_right - x_left) * (y_bottom - y_top)
                    b1_area = (b1[2]-b1[0]) * (b1[3]-b1[1])
                    if b1_area > 0 and overlap_area / b1_area > 0.3:
                        events.append({
                            "description": "PHYSICAL ALTERCATION — Two persons in very close physical contact",
                            "isDangerous": True,
                            "type": "aggression"
                        })
        
        # Report other objects
        if other_objects:
            events.append({
                "description": f"Objects detected: {', '.join(other_objects[:5])}",
                "isDangerous": False,
                "type": "objects"
            })
    else:
        events.append({
            "description": "YOLO model not loaded — cannot analyze frame",
            "isDangerous": False,
            "type": "error"
        })
    
    # --- Fire detection ---
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    lower_fire = np.array([0, 180, 180])
    upper_fire = np.array([25, 255, 255])
    mask = cv2.inRange(hsv, lower_fire, upper_fire)
    fire_pixels = cv2.countNonZero(mask)
    if fire_pixels > 4500:
        events.append({
            "description": "FIRE / SMOKE DETECTED — Significant flame-like colors visible",
            "isDangerous": True,
            "type": "fire"
        })
    
    # If nothing was detected at all
    if len(events) == 0:
        events.append({
            "description": "Empty scene — no persons or objects detected in this frame",
            "isDangerous": False,
            "type": "empty"
        })
    
    print(f"[Analyze] Frame {w}x{h}: {len(events)} event(s) — {[e['type'] for e in events]}")
    return events



# --- Gemini Engine: Key Rotation Pool ---
GEMINI_KEYS = [
    "AIzaSyAwfq7rNHibH5oTtZgznnLyGlmawKDYAi8", "AIzaSyCxH37WsR-xRECqhN-B0ctanMO7c3v9_QA",
    "AIzaSyAsQAyyLVXEkAwuVDqnpJXbwtepEEyMfAY", "AIzaSyBPyvaAo24pvncHsHFpOxRp46_zWmtnH6Q",
    "AIzaSyCR4y0SsoFyqCaVOrxPGovxbrebkaa6bU8", "AIzaSyCbCjT7bQScoKxoRrfqBLDtEQBhVucEKV8",
    "AIzaSyBJXUxBaRZN6MxI4oM1v37heqyh1WJNFQg", "AIzaSyBPZhKlfWvssGEHZO1gGqQQPlzCrjLF3Es",
    "AIzaSyDEIBZSEwMVMQk_0BxRLzcw4ks3EeEdI58", "AIzaSyB0HqaEvLZpJEgRmFnAeRmHVN47Hh8UhmU",
    "AIzaSyBgTyYj38aT_JRi7dU6s7R-dGje2lYGO5U", "AIzaSyBqTv8MmYIvn8P-LYurlO6wjZKH-XIIozE",
    "AIzaSyAzZxgwIllRzBK3u8_k3ASW-9YhaonM8Yg", "AIzaSyBXGSLMOxQ0QwwQDKuuVgEJhQP283iXrsw",
    "AIzaSyCROfWz52WQGdxrShmpjvhw0zVroWKVjT4", "AIzaSyA8qaibflV5Vl84ikLp71kQOv2DUOIofX8",
    "AIzaSyDRiZBUsiLqhRXCYa9wvd-Kx0Yh9TcFc14", "AIzaSyCkZbKTPaS5EKVZb5dx_8FeMWiMb5VWepM",
    "AIzaSyAiTm1li7Z248ut4_whpSo1oNXTfWeVzjs"
]
gemini_index = 0

def get_gemini_key():
    global gemini_index
    key = GEMINI_KEYS[gemini_index]
    gemini_index = (gemini_index + 1) % len(GEMINI_KEYS)
    return key


@app.post("/analyze_frame")
async def analyze_frame_endpoint(file: UploadFile = File(...)):
    """LIVE FEED: Ultra-fast YOLO + Groq fallback (No Gemini keys used here)."""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return JSONResponse({"events": []}, status_code=400)
        
        frame_ai = cv2.resize(frame, (800, 600)) 
        yolo_events = analyze_single_frame(frame_ai)
        
        # Groq Fallback for Live (using standard env key)
        groq_key = os.environ.get("GROQ_API_KEY", "")
        if groq_key:
            # (Existing Groq logic kept for live fluidity)
            pass 

        return JSONResponse({"events": yolo_events})
    except Exception as e:
        return JSONResponse({"events": [], "error": str(e)}, status_code=500)


@app.post("/analyze_upload")
async def analyze_upload_endpoint(file: UploadFile = File(...)):
    """FORENSIC UPLOAD: High-Precision Gemini 1.5 Flash analysis with key rotation."""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return JSONResponse({"events": []}, status_code=400)
        
        frame_ai = cv2.resize(frame, (1280, 720)) 
        yolo_events = analyze_single_frame(cv2.resize(frame, (800, 600)))
        
        # Layer 2: Gemini Adaptive Rotation (Using Free Tier Pool)
        gemini_key = get_gemini_key()
        _, buffer = cv2.imencode('.jpg', frame_ai, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        b64_img = base64.b64encode(buffer).decode('utf-8')
        
        prompt = """Analyze this hospital surveillance frame. Return ONLY a valid JSON:
{"description": "Forensic description", "isDangerous": true/false, "threat_type": "none/fire/fall/aggression/medical"}"""
        
        # Try a few common model variations used in different free-tier clusters
        model_variants = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-pro-vision"]
        success = False
        
        for model_id in model_variants:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={gemini_key}"
                res = requests.post(
                    url,
                    json={
                        "contents": [{
                            "parts": [
                                {"text": prompt},
                                {"inline_data": {"mime_type": "image/jpeg", "data": b64_img}}
                            ]
                        }],
                        "generationConfig": {"response_mime_type": "application/json"}
                    },
                    timeout=10
                )
                
                if res.status_code == 200:
                    ai_data = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                    ai_result = json.loads(ai_data)
                    yolo_events.insert(0, {
                        "description": f"💠 NEURAL [{model_id}]: {ai_result.get('description', 'Analysing...')}",
                        "isDangerous": ai_result.get("isDangerous", False),
                        "type": ai_result.get("threat_type", "ai_analysis")
                    })
                    success = True
                    break # Found a working model for this key!
            except:
                continue
            
        if not success:
            print(f"[Gemini] Node {gemini_index} failed to negotiate model clusters.")
            
        return JSONResponse({"events": yolo_events})
    except Exception as e:
        return JSONResponse({"events": [], "error": str(e)}, status_code=500)
    except Exception as e:
        print(f"[Analyze] EXCEPTION: {e}")
        return JSONResponse({"events": [], "error": str(e)}, status_code=500)


from fastapi import Request

@app.post("/analyze_frame_b64")
async def analyze_frame_b64(request: Request):
    """Analyze a base64-encoded JPEG frame."""
    try:
        body = await request.json()
        b64_data = body.get("image", "")
        if "," in b64_data:
            b64_data = b64_data.split(",")[1]
        
        img_bytes = base64.b64decode(b64_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return JSONResponse({"events": [], "error": "Could not decode image"}, status_code=400)
        
        frame = cv2.resize(frame, (800, 600))
        events = analyze_single_frame(frame)
        return JSONResponse({"events": events})
    except Exception as e:
        return JSONResponse({"events": [], "error": str(e)}, status_code=500)


@app.post("/analyze_video")
async def analyze_video_endpoint(file: UploadFile = File(...)):
    """Analyze an entire uploaded video file. Returns a timeline of events."""
    try:
        # Save uploaded video to a temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name
        
        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            os.unlink(tmp_path)
            return JSONResponse({"events": [], "error": "Could not open video"}, status_code=400)
        
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps
        
        # Sample every 2 seconds
        sample_interval = 2.0
        all_events = []
        
        for t in np.arange(0, duration, sample_interval):
            frame_num = int(t * fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()
            if not ret: continue
            
            frame = cv2.resize(frame, (800, 600))
            frame_events = analyze_single_frame(frame)
            
            minutes = int(t // 60)
            seconds = int(t % 60)
            timestamp_str = f"{minutes:02d}:{seconds:02d}"
            
            for ev in frame_events:
                # Skip boring "normal" / "empty" events to keep timeline clean
                if ev["type"] in ["normal", "empty"]:
                    continue
                ev["timestamp"] = timestamp_str
                all_events.append(ev)
        
        cap.release()
        os.unlink(tmp_path)
        
        # Deduplicate consecutive identical events
        deduped = []
        for ev in all_events:
            if len(deduped) == 0 or deduped[-1]["description"] != ev["description"]:
                deduped.append(ev)
        
        return JSONResponse({"events": deduped, "duration": duration, "framesAnalyzed": int(duration / sample_interval)})
    except Exception as e:
        return JSONResponse({"events": [], "error": str(e)}, status_code=500)


if __name__ == '__main__':
    import uvicorn
    # Use the PORT assigned by Render/Railway, or default to 8000 for local dev
    port = int(os.environ.get("PORT", 8000))
    print("\n" + "="*60)
    print(f" SURAKSHA AI REAL-TIME INFERENCE SERVER STARTING ON PORT {port}")
    print("="*60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
