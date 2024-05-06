from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from src import database
from sqlalchemy.orm import Session

from src.auth.jwthandler import get_current_user
from src.models import ProtocolEncapsulation
from src.schemas import ProtocolEncapsulationOut, ProtocolEncapsulationPatch, ProtocolOut, UserOut, ProtocolEncapsulationIn

import src.crud.protocol_encapsulations as crud

router = APIRouter()

@router.post("/protocol-encapsulations", status_code=status.HTTP_201_CREATED, dependencies=[Depends(get_current_user)])
async def create_protocol_encapsulation(protocol_encapsulation: ProtocolEncapsulationIn, current_user: UserOut = Depends(get_current_user), db: Session = Depends(database.get_conn)) -> ProtocolEncapsulationOut:
    return await crud.create_protocol_encapsulation(protocol_encapsulation, current_user, db)

@router.get("/protocol-encapsulations/{protocol_id}", response_model=list[ProtocolEncapsulationOut], dependencies=[Depends(get_current_user)])
async def read_protocol_encapsulations(protocol_id: str, db: Session = Depends(database.get_conn)) -> list[ProtocolEncapsulationOut]:
    return await crud.read_protocol_encapsulations(protocol_id, db)

@router.put("/protocol-encapsulations/{encapsulation_id}", response_model=ProtocolEncapsulationOut, dependencies=[Depends(get_current_user)])
async def update_protocol_encapsulation(encapsulation_id: str, protocol_encapsulation: ProtocolEncapsulationPatch, current_user: UserOut = Depends(get_current_user), db: Session = Depends(database.get_conn)):
    return await crud.update_protocol_encapsulation(encapsulation_id, protocol_encapsulation, current_user, db)

@router.delete("/protocol-encapsulations/{encapsulation_id}", dependencies=[Depends(get_current_user)])
async def delete_protocol_encapsulation(encapsulation_id: str, current_user: UserOut = Depends(get_current_user), db: Session = Depends(database.get_conn)):
    return await crud.delete_protocol_encapsulation(encapsulation_id, current_user, db)

@router.get("/protocol-encapsulations/{protocol_id}/breadcrumbs", response_model=list[list[ProtocolOut]], dependencies=[Depends(get_current_user)])
async def read_protocol_encapsulation_breadcrumbs(protocol_id: str, db: Session = Depends(database.get_conn)):
    return await crud.read_protocol_encapsulation_breadcrumbs(protocol_id, db)

@router.get("/protocol-encapsulations/{protocol_id}/tree", dependencies=[Depends(get_current_user)])
async def read_protocol_encapsulation_tree(protocol_id: str, db: Session = Depends(database.get_conn)):
    return await crud.read_protocol_encapsulation_tree(protocol_id, db)
