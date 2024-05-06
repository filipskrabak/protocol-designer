from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm

import src.crud.users as crud
from src.auth.users import validate_user
from src.schemas import Status
from src.schemas import UserIn, UserOut

from src import database

from sqlalchemy.orm import Session

from src.auth.jwthandler import (
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)


router = APIRouter()


@router.post("/register", response_model=UserOut)
async def create_user(user: UserIn, db: Session = Depends(database.get_conn)) -> UserOut:
    return await crud.create_user(user, db)


@router.post("/login")
async def login(user: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_conn)):
    user = await validate_user(db, user)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    token = jsonable_encoder(access_token)
    content = {"message": "You've successfully logged in. Welcome back!"}
    response = JSONResponse(content=content)
    response.set_cookie(
        "Authorization",
        value=f"Bearer {token}",
        httponly=True,
        max_age=2592000,
        expires=2592000, # 30 days
        samesite="Lax",
        secure=False, # TODO: Change to True in production
    )

    return response


@router.get(
    "/users/whoami", response_model=UserOut, dependencies=[Depends(get_current_user)]
)
async def read_users_me(current_user: UserOut = Depends(get_current_user)):
    return current_user


@router.delete(
    "/user/{user_id}",
    response_model=Status,
    responses={404: {"description": "User not found"}},
    dependencies=[Depends(get_current_user)],
)
async def delete_user(
    user_id: int, current_user: UserOut = Depends(get_current_user), db: Session = Depends(database.get_conn)
) -> Status:
    return await crud.delete_user(user_id, current_user, db)
