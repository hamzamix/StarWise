from typing import Generator
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core.config import settings
from app.services import security
from app.db import crud
from app import schemas

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_user(
    request: Request, db: Session = Depends(get_db)
) -> schemas.User:
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    
    user_id = security.verify_session_token(session_token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token",
        )
    
    user = crud.user.get(db, id=int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user
