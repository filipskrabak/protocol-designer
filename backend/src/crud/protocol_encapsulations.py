import json
from fastapi import Depends, HTTPException
from copy import deepcopy

from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from src import database
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy.exc import IntegrityError

from src.models import ProtocolEncapsulation, Protocol
from src.schemas import ProtocolEncapsulationOut, ProtocolOut


async def create_protocol_encapsulation(protocol_encapsulation, current_user, db: Session) -> ProtocolEncapsulationOut:
    protocol_encapsulation_model = ProtocolEncapsulation(**protocol_encapsulation.dict())

    try:
        db.add(protocol_encapsulation_model)
        db.commit()
    except IntegrityError:
        raise HTTPException(status_code=401, detail=f"Sorry, that protocol encapsulation already exists.")


    return db.query(ProtocolEncapsulation).filter(ProtocolEncapsulation.id == protocol_encapsulation_model.id).one()

async def read_protocol_encapsulations(protocol_id: str, db: Session) -> list[ProtocolEncapsulationOut]:
    try:
        protocol_encapsulation_model = db.query(ProtocolEncapsulation).filter(ProtocolEncapsulation.parent_protocol_id == protocol_id).all()

        for protocol_encapsulation in protocol_encapsulation_model:
            protocol_encapsulation.fields = json.dumps(protocol_encapsulation.fields)

        return protocol_encapsulation_model
    except NoResultFound:
        raise HTTPException(status_code=404, detail=f"Sorry, this protocol has no encapsulations.")
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Sorry, that protocol ID is invalid.")

async def read_protocol_encapsulation_breadcrumbs(protocol_id, db: Session) -> list[list[ProtocolOut]]:
    try:
        protocol_encapsulation_models = db.query(ProtocolEncapsulation).filter(ProtocolEncapsulation.protocol_id == protocol_id).all()
    except NoResultFound:
        raise HTTPException(status_code=404, detail=f"Protocol {protocol_id} not found")

    breadcrumbs = []

    current_breadcrumbs = []

    for protocol_encapsulation in protocol_encapsulation_models:
        current_breadcrumbs.append(protocol_encapsulation.parent_protocol)

    breadcrumbs.append(deepcopy(current_breadcrumbs))

    while breadcrumbs[-1]:
        current_breadcrumbs = []

        for protocol in breadcrumbs[-1]:
            try:
                protocol_encapsulation_models = db.query(ProtocolEncapsulation).filter(ProtocolEncapsulation.protocol_id == protocol.id).all()
            except NoResultFound:
                break

            for protocol_encapsulation in protocol_encapsulation_models:
                if protocol_encapsulation.parent_protocol not in current_breadcrumbs:
                    current_breadcrumbs.append(protocol_encapsulation.parent_protocol)

        breadcrumbs.append(deepcopy(current_breadcrumbs))

    breadcrumbs.pop()

    return breadcrumbs

async def read_protocol_encapsulation_tree(protocol_id, db: Session):
    try:
        protocol_encapsulation_models = db.query(ProtocolEncapsulation).filter(ProtocolEncapsulation.protocol_id == protocol_id).all()
    except NoResultFound:
        raise HTTPException(status_code=404, detail=f"Protocol encapsulation for {protocol_id} not found")

    try:
        protocol = db.query(Protocol).filter(Protocol.id == protocol_id).one()
    except NoResultFound:
        raise HTTPException(status_code=404, detail=f"Protocol {protocol_id} not found")

    protocol_tree = protocol.__dict__

    protocol_tree['parents'] = []

    for protocol_encapsulation in protocol_encapsulation_models:
        try:
            protocol_tree['parents'].append(await read_protocol_encapsulation_tree(protocol_encapsulation.parent_protocol_id, db))
        except HTTPException:
            pass
    return protocol_tree

async def update_protocol_encapsulation(encapsulation_id, protocol_encapsulation, current_user, db: Session):
    try:
        protocol_encapsulation_model = db.query(ProtocolEncapsulation).filter(ProtocolEncapsulation.id == encapsulation_id).one()
    except NoResultFound:
        raise HTTPException(status_code=404, detail=f"Protocol Encapsulation {encapsulation_id} not found")

    protocol_encapsulation_model.fields = json.dumps(protocol_encapsulation.fields)

    db.commit()

    protocol_encapsulation_model = db.query(ProtocolEncapsulation).filter(ProtocolEncapsulation.id == encapsulation_id).one()

    protocol_encapsulation_model.fields = json.dumps(protocol_encapsulation_model.fields)

    return protocol_encapsulation_model

async def delete_protocol_encapsulation(encapsulation_id, current_user, db: Session):
    try:
        protocol_encapsulation_model = db.query(ProtocolEncapsulation).filter(ProtocolEncapsulation.id == encapsulation_id).one()
    except NoResultFound:
        raise HTTPException(status_code=404, detail=f"Protocol Encapsulation {encapsulation_id} not found")

    db.delete(protocol_encapsulation_model)
    db.commit()

    return {"message": f"Deleted protocol encapsulation {encapsulation_id}"}
