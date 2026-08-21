from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from sqlalchemy.orm import Session
from models.schemas import Reservation, ReservationCreate, User, NotificationSchema
from services import reservation_service
from routers.auth import get_current_user, get_hr_user, is_hr
from db import get_db

router = APIRouter(prefix="/api/reservations", tags=["reservations"])

@router.get("", response_model=List[Reservation])
def get_reservations(date: Optional[str] = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get reservations. If date provided, filters by date. Otherwise all (HR only)."""
    if date:
        return reservation_service.get_reservations_by_date(db, date)
    if not is_hr(user):
        raise HTTPException(status_code=403, detail="HR access required to view all reservations")
    return reservation_service.get_all_reservations(db)

@router.post("", response_model=Reservation, status_code=201)
def create_reservation(data: ReservationCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new parking reservation."""
    # If not HR, ensure they are reserving for themselves
    if not is_hr(user) and data.user_id != user.id:
        raise HTTPException(status_code=403, detail="Cannot reserve for another user")
        
    try:
        return reservation_service.create_reservation(db, data, override_role="hr" if is_hr(user) else user.role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{reservation_id}", status_code=204)
def cancel_reservation(reservation_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Cancel an existing reservation."""
    success = reservation_service.cancel_reservation(db, reservation_id, user.id, "hr" if is_hr(user) else user.role)
    if not success:
        raise HTTPException(status_code=404, detail="Reservation not found or unauthorized.")

@router.get("/history/{user_id}", response_model=List[Reservation])
def get_history(user_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_hr(user) and user.id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return reservation_service.get_user_history(db, user_id)


@router.get("/notifications", response_model=List[NotificationSchema])
def get_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get active unread notifications for the current user."""
    return reservation_service.get_unread_notifications(db, user.id)


@router.post("/notifications/{notification_id}/read")
def mark_read(notification_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Mark a notification as read."""
    success = reservation_service.mark_notification_read(db, user.id, notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success"}
