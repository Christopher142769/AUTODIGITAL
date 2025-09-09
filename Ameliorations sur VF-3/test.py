from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Assistant Dux Web",
    description="API pour modifier des fichiers web avec l'IA",
    version="1.0.0"
)

origins = [
    "http://localhost:3000",
    "https://autodigitalservices.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.post("/register")
async def register():
    return {"message": "OK"}

@app.post("/login")
async def login():
    return {"message": "OK"}
