from sqlalchemy import Column, ForeignKey, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from ..Database.database import Base


class Auth_User(Base):
    __tablename__ = "Auth_User"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)

    username = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    profile = relationship("Personal_Data",back_populates="auth",uselist=False,cascade="all, delete-orphan",)
    projects = relationship("Projects",back_populates="owner",uselist=True,cascade="all, delete-orphan",)


class Personal_Data(Base):
    __tablename__ = "Personal_Data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    auth_id = Column(UUID(as_uuid=True), ForeignKey("Auth_User.id"), unique=True, nullable=False)

    name = Column(String, nullable=False)
    dob = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    occupation = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    auth = relationship("Auth_User",back_populates="profile",uselist=False,)