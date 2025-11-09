from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os, requests

# Load environment variables from .env
load_dotenv()

# Initialize FastAPI
app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenRouter API key from environment
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    raise RuntimeError("OPENROUTER_API_KEY not set in .env")

# Root route
@app.get("/")
def home():
    return {"message": "LocalLink AI Chatbot (OpenRouter) is running 🚀"}

# Chat route
@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    user_message = data.get("message", "")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://localhost:5173",  # change to your frontend URL
        "X-Title": "LocalLink AI Chatbot"
    }

    payload = {
        "model": "meta-llama/llama-3.1-70b-instruct",  # or any supported OpenRouter model
        "messages": [
            {"role": "system", "content": "You are LocalLink, a helpful AI that connects users to local services."},
            {"role": "user", "content": user_message}
        ]
    }

    try:
        # Call OpenRouter API
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

        # Debug: print full response structure
        print("OpenRouter response:", data)

        # Safely extract AI reply
        choices = data.get("choices", [])
        if not choices:
            return {"reply": "Sorry, I couldn’t generate a response."}

        reply = choices[0].get("message", {}).get("content") or choices[0].get("text") or "No reply from AI."
        return {"reply": reply}

    except Exception as e:
        print("Error calling OpenRouter:", str(e))
        return {"reply": "Oops! Something went wrong with the AI."}
