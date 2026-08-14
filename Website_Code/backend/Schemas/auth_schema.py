from uuid import UUID
from datetime import datetime
from typing import Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


class SignupRequest(BaseModel):
    username: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password Too Short")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_at: Optional[datetime] = None


class RefreshRequest(BaseModel):
    refresh_token: str = Field(
        ...,
        description="The refresh token provided during login."
    )



class PersonalDataBase(BaseModel):
    name: str
    dob: str
    phone: str
    email: EmailStr
    occupation: Optional[str] = None


class PersonalDataCreate(PersonalDataBase):
    pass


class PersonalDataUpdate(BaseModel):
    name: Optional[str] = None
    dob: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    occupation: Optional[str] = None


class PersonalDataResponse(PersonalDataBase):
    id: UUID

    model_config = ConfigDict(from_attributes=True)