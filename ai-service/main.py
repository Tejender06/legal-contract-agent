from fastapi import FastAPI

app = FastAPI(title="Legal Contract Agent AI")

@app.get("/")
async def health_check():
    return {"status": "AI Service is running", "version": "1.0"}
