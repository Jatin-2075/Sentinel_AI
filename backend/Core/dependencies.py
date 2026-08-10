import uuid
import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from ..Database.database import SessionLocal, get_db
from ..Models.auth_model import Auth_User
from .jwt import ALGORITHM, SECRET_KEY
from ..Models.project_model import Projects


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def decode_access_token(token: str) -> uuid.UUID | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        user_id_str: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")

        if user_id_str is None or token_type != "access":
            return None

        return uuid.UUID(user_id_str)

    except (JWTError, ValueError):
        return None


def get_user_from_token_ws(token: str) -> Auth_User | None:
    user_id = decode_access_token(token)

    if user_id is None:
        return None

    db = SessionLocal()

    try:
        return db.query(Auth_User).filter(Auth_User.id == user_id).first()
    finally:
        db.close()


async def get_current_user(token: str = Depends(oauth2_scheme),db: Session = Depends(get_db),) -> Auth_User:
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Could not validate credentials",headers={"WWW-Authenticate": "Bearer"},)
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        user_id_str: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")

        if user_id_str is None or token_type != "access":
            raise credentials_exception

        user_id = uuid.UUID(user_id_str)

    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(Auth_User).filter(Auth_User.id == user_id).first()

    if user is None:
        raise credentials_exception

    return user

def get_api_key(length: int, db: Session) -> str:
    api_key = secrets.token_urlsafe(length)

    existing = db.query(Projects).filter(Projects.api_key == api_key).first()
    if existing:
        return get_api_key(length, db)

    return api_key