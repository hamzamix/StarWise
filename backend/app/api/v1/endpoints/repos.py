from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.db import crud
from app import schemas
from app.services import gemini as gemini_service

router = APIRouter()

@router.get("/starred", response_model=List[schemas.Repository])
def get_starred_repos(
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_user)
):
    repos = crud.repository.get_multi_by_owner(db, owner_id=current_user.id)
    return repos

@router.post("/{repo_id}/tags", response_model=schemas.Repository)
def update_repo_tags(
    repo_id: int,
    tags: List[str],
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_user)
):
    repo = crud.repository.get(db, id=repo_id)
    if not repo or repo.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")

    updated_repo = crud.repository.update_tags(db, repo_id=repo_id, tag_names=tags)
    return updated_repo

@router.post("/{repo_id}/suggest-tags", response_model=List[str])
async def suggest_tags_for_repo(
    repo_id: int,
    db: Session = Depends(deps.get_db),
    current_user: schemas.User = Depends(deps.get_current_user)
):
    repo = crud.repository.get(db, id=repo_id)
    if not repo or repo.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Repository not found")

    try:
        suggested_tags = await gemini_service.suggest_tags_for_repo(repo)
        return suggested_tags
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
