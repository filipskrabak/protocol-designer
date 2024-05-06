from fastapi import Depends, HTTPException

from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from src import database
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy.exc import IntegrityError

from src.models import Protocol
from src.schemas import ProtocolOut


async def create_protocol(protocol, current_user, db: Session) -> ProtocolOut:
    protocol_model = Protocol(**protocol.dict())
    protocol_model.user_id = current_user.id

    try:
        db.add(protocol_model)
        db.commit()
    except IntegrityError:
        raise HTTPException(status_code=401, detail=f"Sorry, that protocol already exists.")


    return db.query(Protocol).filter(Protocol.id == protocol_model.id).one()

async def read_protocol(protocol_id: str, current_user, db: Session) -> ProtocolOut:
    try:
        return db.query(Protocol).filter(Protocol.id == protocol_id, Protocol.user_id == current_user.id).one()
    except NoResultFound:
        raise HTTPException(status_code=404, detail=f"Protocol {protocol_id} not found")

async def read_protocols(current_user, db: Session) -> list[ProtocolOut]:
    return db.query(Protocol).filter(Protocol.user_id == current_user.id).all()

async def update_protocol(protocol_id: str, protocol, current_user, db: Session) -> ProtocolOut:
    try:
        protocol_model = db.query(Protocol).filter(Protocol.id == protocol_id, Protocol.user_id == current_user.id).one()
    except NoResultFound:
        raise HTTPException(status_code=404, detail=f"Protocol {protocol_id} not found")

    for key, value in protocol.dict().items():
        setattr(protocol_model, key, value)

    db.commit()

    return db.query(Protocol).filter(Protocol.id == protocol_id).one()

async def delete_protocol(protocol_id, current_user, db: Session):
    try:
        protocol_model = db.query(Protocol).filter(Protocol.id == protocol_id, Protocol.user_id == current_user.id).one()
    except NoResultFound:
        raise HTTPException(status_code=404, detail=f"Protocol {protocol_id} not found")

    db.delete(protocol_model)
    db.commit()

    return {"message": f"Deleted protocol {protocol_id}"}


# Upload and Download Protocol SVG
from src.schemas import ProtocolSVG

async def upload_protocol_svg(protocol_id: str, file, current_user, db: Session):
    try:
        protocol_model = db.query(Protocol).filter(Protocol.id == protocol_id, Protocol.user_id == current_user.id).one()
    except NoResultFound:
        raise HTTPException(status_code=404, detail=f"Protocol {protocol_id} not found")

    # Save this file to static, name it protocol_id.svg
    with open(f"static/{protocol_id}.svg", "wb") as f:
        f.write(file.file.read())
        f.close()

    return {"message": f"Uploaded SVG for protocol {protocol_id}"}

