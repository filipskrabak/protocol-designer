from fastapi import Depends, HTTPException
from passlib.context import CryptContext

from src.models import User
from src.schemas import Status
from src.schemas import UserOut

from sqlalchemy.orm import Session
from src import database
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy.exc import IntegrityError


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_user(user, db: Session) -> UserOut:
    user.password = pwd_context.encrypt(user.password)

    try:
        db.add(User(email=user.email, password=user.password, name=user.name))
        db.commit()
    except IntegrityError:
        raise HTTPException(status_code=401, detail=f"Sorry, that email already exists.")

    user_obj = db.query(User).filter(User.email == user.email).one()

    return db.query(User).filter(User.id == user_obj.id).one()


async def delete_user(user_id, current_user, db) -> Status:
    try:
        db_user = db.query(User).filter(User.id == user_id).one()
    except NoResultFound:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    if db_user.id == current_user.id:
        deleted_count = db.query(User).filter(User.id == user_id).delete()
        if not deleted_count:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        return Status(message=f"Deleted user {user_id}")

    raise HTTPException(status_code=403, detail=f"Not authorized to delete")
