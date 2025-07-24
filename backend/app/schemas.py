from pydantic import BaseModel
from typing import List, Optional

# Tag Schemas
class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class TagUpdate(TagBase):
    pass

class Tag(TagBase):
    id: int
    class Config:
        orm_mode = True

# Repository Schemas
class RepositoryBase(BaseModel):
    github_id: int
    name: str
    full_name: str
    description: Optional[str] = None
    url: str
    language: Optional[str] = None
    stars: int

class RepositoryCreate(RepositoryBase):
    owner_id: int

class RepositoryUpdate(RepositoryBase):
    pass

class Repository(RepositoryBase):
    id: int
    owner_id: int
    tags: List[Tag] = []
    class Config:
        orm_mode = True

# User Schemas
class UserBase(BaseModel):
    username: str
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    github_id: int
    access_token: str

class UserUpdate(BaseModel):
    access_token: Optional[str] = None

class User(UserBase):
    id: int
    github_id: int
    repositories: List[Repository] = []
    class Config:
        orm_mode = True
