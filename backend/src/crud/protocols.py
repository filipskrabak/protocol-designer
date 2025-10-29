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
import xml.etree.ElementTree as ET

async def upload_protocol_svg(protocol_id: str, file, current_user, db: Session):
    try:
        protocol_model = db.query(Protocol).filter(Protocol.id == protocol_id, Protocol.user_id == current_user.id).one()
    except NoResultFound:
        raise HTTPException(status_code=404, detail=f"Protocol {protocol_id} not found")

    # Read file content for validation
    file_content = file.file.read()

    # Validate SVG and SCXML structure
    try:
        tree = ET.ElementTree(ET.fromstring(file_content))
        root = tree.getroot()

        # Check if it's a valid SVG
        if not root.tag.endswith('svg'):
            raise HTTPException(status_code=400, detail="Invalid SVG file")

        # Check for metadata element
        metadata = root.find('.//{http://www.protocoldescription.com}info')
        if metadata is None:
            raise HTTPException(status_code=400, detail="SVG missing protocol metadata")

        # Validate SCXML elements if present
        scxml_ns = "{http://www.w3.org/2005/07/scxml}"
        scxml_elements = root.findall(f".//{scxml_ns}scxml")

        if scxml_elements:
            for scxml_el in scxml_elements:
                # Basic validation: check for states
                states = scxml_el.findall(f".//{scxml_ns}state")
                if not states:
                    raise HTTPException(status_code=400, detail="SCXML element has no states")

                # Check that all states have IDs
                for state in states:
                    if not state.get('id'):
                        raise HTTPException(status_code=400, detail="SCXML state missing required 'id' attribute")

                # Check that all transitions have targets
                transitions = scxml_el.findall(f".//{scxml_ns}transition")
                for trans in transitions:
                    if not trans.get('target'):
                        raise HTTPException(status_code=400, detail="SCXML transition missing required 'target' attribute")

                print(f"Validated SCXML: found {len(states)} states and {len(transitions)} transitions")

    except ET.ParseError as e:
        raise HTTPException(status_code=400, detail=f"Invalid XML structure: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SVG validation failed: {str(e)}")

    # Save this file to static, name it protocol_id.svg
    with open(f"static/{protocol_id}.svg", "wb") as f:
        f.write(file_content)
        f.close()

    return {"message": f"Uploaded SVG for protocol {protocol_id}"}

