from fastapi import APIRouter

from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview")
def overview():
    return admin_service.overview()


@router.get("/students")
def students():
    return admin_service.student_rows()
