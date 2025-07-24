from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from .base_class import Base

repo_tag_association = Table(
    'repo_tag_association', Base.metadata,
    Column('repo_id', Integer, ForeignKey('repositories.id')),
    Column('tag_id', Integer, ForeignKey('tags.id'))
)

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    github_id = Column(Integer, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    avatar_url = Column(String)
    access_token = Column(String, nullable=False)
    repositories = relationship("Repository", back_populates="owner")

class Repository(Base):
    __tablename__ = 'repositories'
    id = Column(Integer, primary_key=True, index=True)
    github_id = Column(Integer, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    description = Column(String)
    url = Column(String, nullable=False)
    language = Column(String)
    stars = Column(Integer, nullable=False)
    owner_id = Column(Integer, ForeignKey('users.id'))
    owner = relationship("User", back_populates="repositories")
    tags = relationship("Tag", secondary=repo_tag_association, back_populates="repositories")

class Tag(Base):
    __tablename__ = 'tags'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    repositories = relationship("Repository", secondary=repo_tag_association, back_populates="tags")
