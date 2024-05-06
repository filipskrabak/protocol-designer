from fastapi import HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from passlib.context import CryptContext

from src.models import User
from src.schemas import UserOutDB

from sqlalchemy.orm import Session
from src import database
from sqlalchemy.orm.exc import NoResultFound

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


async def get_user(email: str, db: Session):
    return db.query(User).filter(User.email == email).one()


async def validate_user(db: Session, user: OAuth2PasswordRequestForm = Depends()):
    try:
        db_user = await get_user(user.username, db)
    except NoResultFound:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    if not verify_password(user.password, db_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    return db_user
