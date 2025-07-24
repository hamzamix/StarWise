from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from app.api import deps
from app.core.config import settings
from app.services import github as github_service
from app.services import security
from app.db import crud
from app import schemas

router = APIRouter()

@router.get("/login/github")
def login_github():
    return github_service.get_oauth_redirect()

@router.get("/callback/github")
async def callback_github(code: str, db: Session = Depends(deps.get_db)):
    try:
        token_data = await github_service.get_access_token(code)
        access_token = token_data["access_token"]

        user_data = await github_service.get_github_user_data(access_token)
        
        user = crud.user.get_by_github_id(db, github_id=user_data["id"])
        if not user:
            user_in = schemas.UserCreate(
                github_id=user_data["id"],
                username=user_data["login"],
                avatar_url=user_data["avatar_url"],
                access_token=access_token,
            )
            user = crud.user.create(db, obj_in=user_in)
        else:
            user_update = schemas.UserUpdate(access_token=access_token)
            user = crud.user.update(db, db_obj=user, obj_in=user_update)

        # Sync starred repos upon login
        starred_repos = await github_service.get_starred_repos(user.access_token)
        crud.repository.sync_repositories(db, user_id=user.id, repos_data=starred_repos)

        response = Response(status_code=303)
        response.headers["Location"] = "http://localhost:3000" # Redirect to frontend
        
        session_token = security.create_session_token(str(user.id))
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            samesite="lax",
            secure=False, # Set to True in production with HTTPS
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        return response

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Authentication failed: {e}")

@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: schemas.User = Depends(deps.get_current_user)):
    return current_user

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="session_token")
    return {"message": "Successfully logged out"}
