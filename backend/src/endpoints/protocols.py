from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from src import database
from sqlalchemy.orm import Session

from src.auth.jwthandler import get_current_user
from src.models import Protocol
from src.schemas import ProtocolIn, ProtocolOut, UserOut

import src.crud.protocols as crud

router = APIRouter()

@router.post("/protocols", status_code=status.HTTP_201_CREATED, dependencies=[Depends(get_current_user)])
async def create_protocol(protocol: ProtocolIn, current_user: UserOut = Depends(get_current_user), db: Session = Depends(database.get_conn)) -> ProtocolOut:
    return await crud.create_protocol(protocol, current_user, db)

@router.get("/protocols/{protocol_id}", response_model=ProtocolOut, dependencies=[Depends(get_current_user)])
async def read_protocol(protocol_id: str, current_user: UserOut = Depends(get_current_user), db: Session = Depends(database.get_conn)) -> ProtocolOut:
    return await crud.read_protocol(protocol_id, current_user, db)

@router.get("/protocols", response_model=list[ProtocolOut], dependencies=[Depends(get_current_user)])
async def read_protocols(current_user: UserOut = Depends(get_current_user), db: Session = Depends(database.get_conn)) -> list[ProtocolOut]:
    return await crud.read_protocols(current_user, db)

@router.put("/protocols/{protocol_id}", response_model=ProtocolOut, dependencies=[Depends(get_current_user)])
async def update_protocol(protocol_id: str, protocol: ProtocolIn, current_user: UserOut = Depends(get_current_user), db: Session = Depends(database.get_conn)) -> ProtocolOut:
    return await crud.update_protocol(protocol_id, protocol, current_user, db)

@router.delete("/protocols/{protocol_id}", dependencies=[Depends(get_current_user)])
async def delete_protocol(protocol_id: str, current_user: UserOut = Depends(get_current_user), db: Session = Depends(database.get_conn)):
    return await crud.delete_protocol(protocol_id, current_user, db)


# Upload Protocol SVG
from fastapi import File, UploadFile
from src.schemas import ProtocolSVG

@router.post("/protocols/{protocol_id}/upload", dependencies=[Depends(get_current_user)])
async def upload_protocol_svg(protocol_id: str, file: UploadFile = File(...), current_user: UserOut = Depends(get_current_user), db: Session = Depends(database.get_conn)):
    return await crud.upload_protocol_svg(protocol_id, file, current_user, db)
