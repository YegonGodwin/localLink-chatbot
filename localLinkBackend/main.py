from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os, requests, time
from local_services import LOCAL_SERVICES, LOCAL_FAQS  # import your real data

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change this to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY:
    raise RuntimeError("OPENROUTER_API_KEY not set in .env")

# 🧠 In-memory session-based memory (simple context store)
conversation_memory = {}

# --- Helper Functions ---

def get_context(session_id: str):
    """Return conversation history for a session."""
    return conversation_memory.get(session_id, [])

def update_context(session_id: str, role: str, content: str):
    """Update conversation memory."""
    if session_id not in conversation_memory:
        conversation_memory[session_id] = []
    conversation_memory[session_id].append({"role": role, "content": content})

    # Keep only last 10 messages
    if len(conversation_memory[session_id]) > 10:
        conversation_memory[session_id] = conversation_memory[session_id][-10:]

def fetch_local_info(user_message: str) -> str:
    """Detect intent and fetch relevant LocalLink info."""
    msg = user_message.lower()
    context = ""

    if "photo" in msg or "shoot" in msg:
        context += "📸 LocalLink Photography Packages:\n"
        for name, desc in LOCAL_SERVICES.get("photography", {}).items():
            context += f"- {name}: {desc}\n"

    elif "event" in msg or "plan" in msg:
        context += "🎉 LocalLink Event Planning Options:\n"
        for name, desc in LOCAL_SERVICES.get("event_planning", {}).items():
            context += f"- {name}: {desc}\n"

    elif "clean" in msg:
        context += "🧹 LocalLink Home Cleaning Packages:\n"
        for name, desc in LOCAL_SERVICES.get("home_cleaning", {}).items():
            context += f"- {name}: {desc}\n"

    elif "book" in msg:
        context += f"🗓 Booking info: {LOCAL_FAQS.get('booking', '')}\n"

    elif "pay" in msg or "mpesa" in msg:
        context += f"💳 Payment info: {LOCAL_FAQS.get('payment', '')}\n"

    elif "support" in msg or "help" in msg:
        context += f"📞 Support info: {LOCAL_FAQS.get('support', '')}\n"

    return context.strip()

# --- API Routes ---

@app.get("/")
def home():
    return {"message": "🤖 LocalLink AI Chatbot is running and ready to help!"}

@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    user_message = data.get("message", "").strip()
    session_id = data.get("session_id", "default_user")  # from frontend, can be userID or random UUID

    # Store user input
    update_context(session_id, "user", user_message)
    context = get_context(session_id)

    # 🧩 Base system prompt for AI behavior
    system_prompt = (
        "You are LocalLink, a friendly and intelligent AI assistant designed to help users discover, "
        "book, and learn about local services such as photography, event planning, home cleaning, and more. "
        "Always reply warmly, add emojis naturally, and make responses short, human-like, and engaging. "
        "If the user asks about something unavailable, politely say so and suggest contacting LocalLink support. "
        "Use real LocalLink data provided to ensure accurate answers."
    )

    # 📚 Fetch LocalLink service data if relevant
    local_info = fetch_local_info(user_message)
    if local_info:
        system_prompt += f"\n\nHere is LocalLink's current service data:\n{local_info}\n"

    payload = {
        "model": "meta-llama/llama-3.1-70b-instruct",
        "messages": [{"role": "system", "content": system_prompt}] + context,
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://localhost:5173",  # change this for production
        "X-Title": "LocalLink AI Chatbot",
    }

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()

        # Extract AI response
        reply = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "Hmm, I couldn’t come up with a reply.")
        )

        # Save assistant reply in session memory
        update_context(session_id, "assistant", reply)

        return {"reply": reply, "context_length": len(context)}

    except Exception as e:
        print("Error calling OpenRouter:", str(e))
        return {"reply": "😕 Oops! I ran into a problem connecting to the AI service."}
