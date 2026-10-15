import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if api_key and api_key != "your_gemini_api_key_here":
    client = genai.Client(api_key=api_key)
    interaction = client.interactions.create(
        model="gemini-3.8-flash",
        input="Hello Gemini, are you working?",
    )
    print(interaction.output_text)
else:
    print("Please set your GEMINI_API_KEY in backend/.env to test live Gemini API calls.")