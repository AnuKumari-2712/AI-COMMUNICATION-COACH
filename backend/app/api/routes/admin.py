from fastapi import APIRouter

from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview")
def overview():
    return admin_service.overview()


@router.get("/students")
def students():
    return admin_service.student_rows()


@router.get("/growth")
def growth():
    return admin_service.growth()


@router.get("/activity")
def activity():
    return admin_service.activity()


@router.get("/skill-distribution")
def skill_distribution():
    return admin_service.skill_distribution()

