import requests
import json

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

def test_key(key, index):
    # Testing with stable v1 and simple text model to verify key validity
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key={key}"
    payload = {
        "contents": [{"parts": [{"text": "Is this key active?"}]}]
    }
    try:
        res = requests.post(url, json=payload, timeout=5)
        if res.status_code == 200:
            print(f"[NODE {index+1}] SUCCESS: Key is active and responding.")
            return True
        else:
            print(f"[NODE {index+1}] FAILED: Status {res.status_code} - {res.text[:100]}")
            return False
    except Exception as e:
        print(f"[NODE {index+1}] ERROR: {str(e)}")
        return False

print("--- SURAKSHA AI // GEMINI POOL DIAGNOSTIC ---")
results = []
for i, k in enumerate(GEMINI_KEYS):
    results.append(test_key(k, i))

print("\n--- SUMMARY ---")
print(f"Total Nodes: {len(GEMINI_KEYS)}")
print(f"Active Nodes: {sum(results)}")
print(f"Failed Nodes: {len(GEMINI_KEYS) - sum(results)}")
