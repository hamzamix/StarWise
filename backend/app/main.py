from fastapi import FastAPI
from app.api.v1.api import api_router  # Import your API router

app = FastAPI()

app.include_router(api_router, prefix="/api")  # Register API router at /api

@app.get("/")
def read_root():
    return {"message": "Starwise backend is running"}
