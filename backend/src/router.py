from fastapi import APIRouter

from src.endpoints import users
from src.endpoints import protocols
from src.endpoints import protocol_encapsulations
from src.endpoints import health

router = APIRouter()

router.include_router(health.router, tags=["health"])
router.include_router(users.router, tags=["users"])
router.include_router(protocols.router, tags=["protocols"])
router.include_router(protocol_encapsulations.router, tags=["protocol encapsulations"])
