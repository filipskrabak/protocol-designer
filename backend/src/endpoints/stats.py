from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_conn
from src.models import Protocol, User

router = APIRouter()

@router.get("/stats")
async def get_public_stats(db: Session = Depends(get_conn)):
    protocol_count = db.query(Protocol).count()
    return {"protocol_count": protocol_count}
