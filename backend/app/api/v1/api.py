from fastapi import APIRouter
from .endpoints import auth, repos

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(repos.router, prefix="/repos", tags=["repos"])
