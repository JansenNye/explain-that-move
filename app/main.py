from fastapi import FastAPI 
app = FastAPI(title="Explain-that-Move")

@app.get("/health")
async def health():
    return {"status": "ok"}




    