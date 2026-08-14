from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..Database.database import get_db
from ..Models.auth_model import Auth_User, Personal_Data
from ..Schemas.auth_schema import (
    SignupRequest,
    LoginRequest,
    RefreshRequest,
    TokenResponse,

    PersonalDataCreate,
    PersonalDataResponse,
    PersonalDataUpdate,
)
from ..Core.jwt import hash_password, verify_password, create_access_token, create_refresh_token, SECRET_KEY, ALGORITHM
from ..Core.dependencies import decode_access_token, get_current_user, get_user_from_token_ws

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing_username = (
        db.query(Auth_User)
        .filter(Auth_User.username == payload.username)
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User Already Exist"
        )

    new_user = Auth_User(
        username=payload.username,
        password=hash_password(payload.password),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User Created Enjoy",
        "access_token": create_access_token(new_user.id),
        "refresh_token": create_refresh_token(new_user.id),
        "token_type": "bearer",
    }


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Auth_User).filter(Auth_User.username == payload.username).first()

    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    from jose import jwt, JWTError

    try:
        decoded = jwt.decode(payload.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = decoded.get("sub")
        token_type: str | None = decoded.get("type")

        if user_id is None or token_type != "refresh":
            raise ValueError("Invalid token")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user = db.query(Auth_User).filter(Auth_User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
    }

@router.post("/createprofile", response_model=PersonalDataResponse)
def create_profile(data: PersonalDataCreate,db: Session = Depends(get_db),current_user: Auth_User = Depends(get_current_user),):
    existing = (
        db.query(Personal_Data)
        .filter(Personal_Data.auth_id == current_user.id)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists"
        )

    profile = Personal_Data(
        auth_id=current_user.id,
        **data.model_dump()
    )

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return profile


@router.get("/getprofile", response_model=PersonalDataResponse)
def get_profile(db: Session = Depends(get_db),current_user: Auth_User = Depends(get_current_user),):
    profile = (
        db.query(Personal_Data)
        .filter(Personal_Data.auth_id == current_user.id)
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not found"
        )

    return profile


@router.put("/updateprofile", response_model=PersonalDataResponse)
def update_profile(data: PersonalDataUpdate,db: Session = Depends(get_db),current_user: Auth_User = Depends(get_current_user),):
    profile = (
        db.query(Personal_Data)
        .filter(Personal_Data.auth_id == current_user.id)
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)

    return profile


@router.delete("/deleteprofile")
def delete_profile(db: Session = Depends(get_db),current_user: Auth_User = Depends(get_current_user),):
    profile = (
        db.query(Personal_Data)
        .filter(Personal_Data.auth_id == current_user.id)
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not found"
        )

    db.delete(profile)
    db.commit()

    return {"message": "Profile deleted successfully"}