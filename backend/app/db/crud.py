from sqlalchemy.orm import Session
from typing import List, Dict, Any

from .base import CRUDBase
from . import models
from app import schemas

class CRUDUser(CRUDBase[models.User, schemas.UserCreate, schemas.UserUpdate]):
    def get_by_github_id(self, db: Session, *, github_id: int) -> models.User | None:
        return db.query(self.model).filter(self.model.github_id == github_id).first()

class CRUDRepository(CRUDBase[models.Repository, schemas.RepositoryCreate, schemas.RepositoryUpdate]):
    def get_multi_by_owner(self, db: Session, *, owner_id: int) -> List[models.Repository]:
        return db.query(self.model).filter(self.model.owner_id == owner_id).all()

    def sync_repositories(self, db: Session, *, user_id: int, repos_data: List[Dict[str, Any]]):
        db_repos = {r.github_id: r for r in self.get_multi_by_owner(db, owner_id=user_id)}
        api_repo_ids = {r['id'] for r in repos_data}

        # Delete repos that are no longer starred
        for github_id, repo in db_repos.items():
            if github_id not in api_repo_ids:
                db.delete(repo)

        # Add or update repos
        for repo_data in repos_data:
            repo_in = schemas.RepositoryCreate(
                github_id=repo_data['id'],
                name=repo_data['name'],
                full_name=repo_data['full_name'],
                description=repo_data.get('description'),
                url=repo_data['html_url'],
                language=repo_data.get('language'),
                stars=repo_data['stargazers_count'],
                owner_id=user_id,
            )
            if repo_data['id'] in db_repos:
                self.update(db, db_obj=db_repos[repo_data['id']], obj_in=repo_in)
            else:
                self.create(db, obj_in=repo_in)
        db.commit()

    def update_tags(self, db: Session, *, repo_id: int, tag_names: List[str]) -> models.Repository:
        repo = db.query(models.Repository).filter(models.Repository.id == repo_id).one()
        repo.tags.clear()
        for tag_name in tag_names:
            tag = db.query(models.Tag).filter(models.Tag.name == tag_name).first()
            if not tag:
                tag = models.Tag(name=tag_name)
                db.add(tag)
            repo.tags.append(tag)
        db.commit()
        db.refresh(repo)
        return repo

class CRUDTag(CRUDBase[models.Tag, schemas.TagCreate, schemas.TagUpdate]):
    def get_by_name(self, db: Session, *, name: str) -> models.Tag | None:
        return db.query(self.model).filter(self.model.name == name).first()

# Base class for CRUD operations
from typing import TypeVar, Type, Generic, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
from .base_class import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def get(self, db: Session, id: Any) -> ModelType | None:
        return db.query(self.model).filter(self.model.id == id).first()

    def create(self, db: Session, *, obj_in: CreateSchemaType) -> ModelType:
        obj_in_data = obj_in.dict()
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, db: Session, *, db_obj: ModelType, obj_in: UpdateSchemaType | dict
    ) -> ModelType:
        obj_data = db_obj.__dict__
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

user = CRUDUser(models.User)
repository = CRUDRepository(models.Repository)
tag = CRUDTag(models.Tag)
