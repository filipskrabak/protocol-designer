from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_conn

router = APIRouter()

@router.get("/health")
async def health_check(db: Session = Depends(get_conn)):
    """Health check endpoint for deployment monitoring."""
    try:
        # Test database connectivity
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

@router.get("/readiness")
async def readiness_check():
    """Readiness check for load balancer."""
    return {"status": "ready"}