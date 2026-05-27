from fastapi import APIRouter

from src.endpoints import users
from src.endpoints import protocols
from src.endpoints import protocol_encapsulations
from src.endpoints import health
from src.endpoints import fsm_analysis
from src.endpoints import cpn_analysis
from src.endpoints import cpnpy_analysis
from src.endpoints import stats

router = APIRouter()

router.include_router(health.router, tags=["health"])
router.include_router(stats.router, tags=["stats"])
router.include_router(users.router, tags=["users"])
router.include_router(protocols.router, tags=["protocols"])
router.include_router(protocol_encapsulations.router, tags=["protocol encapsulations"])
router.include_router(fsm_analysis.router, tags=["fsm analysis"])
router.include_router(cpn_analysis.router, tags=["cpn analysis"])
router.include_router(cpnpy_analysis.router, tags=["cpnpy analysis"])
