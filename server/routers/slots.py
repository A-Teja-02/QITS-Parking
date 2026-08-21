from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models.schemas import Floor, Slot, ManagerRelease, User
from services import parking_service
from routers.auth import get_current_user, get_hr_user, is_hr
from services.reservation_service import get_tomorrow_date, is_weekend
from db import get_db

router = APIRouter(prefix="/api", tags=["slots"])

@router.get("/floors", response_model=List[Floor])
def get_floors(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return parking_service.get_all_floors(db)

@router.patch("/floors/{floor_id}/status")
def set_floor_status(floor_id: str, data: dict, hr: User = Depends(get_hr_user), db: Session = Depends(get_db)):
    if not parking_service.set_floor_status(db, floor_id, data.get("is_active", True)):
        raise HTTPException(status_code=404, detail="Floor not found")
    return {"status": "success"}

@router.get("/slots", response_model=List[Slot])
def get_slots(floor_id: Optional[str] = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return parking_service.get_slots_by_floor(db, floor_id)

@router.get("/slots/status")
def get_slot_status():
    return {
        "tomorrow": get_tomorrow_date(),
        "is_weekend": is_weekend(),
    }

@router.post("/slots", response_model=Slot, status_code=201)
def create_slot(data: dict, hr: User = Depends(get_hr_user), db: Session = Depends(get_db)):
    return parking_service.create_slot(db, data)

@router.put("/slots/{slot_id}", response_model=Slot)
def update_slot(slot_id: str, data: dict, hr: User = Depends(get_hr_user), db: Session = Depends(get_db)):
    slot = parking_service.update_slot(db, slot_id, data)
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    return slot

@router.delete("/slots/{slot_id}", status_code=204)
def delete_slot(slot_id: str, hr: User = Depends(get_hr_user), db: Session = Depends(get_db)):
    if not parking_service.delete_slot(db, slot_id):
        raise HTTPException(status_code=404, detail="Slot not found")

@router.patch("/slots/{slot_id}/status")
def set_slot_status(slot_id: str, data: dict, hr: User = Depends(get_hr_user), db: Session = Depends(get_db)):
    if not parking_service.set_slot_status(db, slot_id, data.get("status", "active")):
        raise HTTPException(status_code=404, detail="Slot not found")
    return {"status": "success"}

@router.post("/slots/{slot_id}/assign-manager")
def assign_manager(slot_id: str, data: dict, hr: User = Depends(get_hr_user), db: Session = Depends(get_db)):
    if not parking_service.assign_manager(db, slot_id, data.get("manager_id")):
        raise HTTPException(status_code=400, detail="Assignment failed. Manager may already have a slot.")
    return {"status": "success"}

@router.delete("/slots/{slot_id}/assign-manager")
def remove_manager(slot_id: str, hr: User = Depends(get_hr_user), db: Session = Depends(get_db)):
    if not parking_service.remove_manager(db, slot_id):
        raise HTTPException(status_code=404, detail="Slot not found")
    return {"status": "success"}

@router.post("/slots/{slot_id}/release")
def release_slot(slot_id: str, data: dict = Body(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "manager" and not is_hr(user):
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        manager_id = data.get("manager_id", user.id)
        if not is_hr(user) and manager_id != user.id:
            raise HTTPException(status_code=403, detail="Cannot release another manager's slot")
            
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        
        if start_date and end_date:
            releases = parking_service.release_manager_slot_range(db, manager_id, slot_id, start_date, end_date)
            return releases
        else:
            single_date = data.get("date")
            if not single_date:
                raise HTTPException(status_code=400, detail="Either 'date' or both 'start_date' and 'end_date' must be provided")
            release = parking_service.release_manager_slot(db, manager_id, slot_id, single_date)
            return release
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/slots/reserved")
def get_reserved_slots(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not is_hr(user):
        raise HTTPException(status_code=403, detail="HR access required")
    return parking_service.get_reserved_slots(db)

@router.get("/manager-releases")
def get_manager_releases(date: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return parking_service.get_manager_releases(db, date)

@router.delete("/slots/{slot_id}/release")
def cancel_release(slot_id: str, data: dict = Body(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "manager" and not is_hr(user):
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        manager_id = data.get("manager_id", user.id)
        if not is_hr(user) and manager_id != user.id:
            raise HTTPException(status_code=403, detail="Cannot cancel another manager's release")
            
        date = data.get("date")
        start_date_str = data.get("start_date")
        end_date_str = data.get("end_date")
        
        if date:
            success = parking_service.cancel_manager_release(db, manager_id, slot_id, date)
            if not success:
                raise HTTPException(status_code=404, detail="Release not found")
            return {"status": "success"}
        elif start_date_str and end_date_str:
            from datetime import datetime, timedelta
            try:
                start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
            if start_date > end_date:
                raise HTTPException(status_code=400, detail="Start date must be before or equal to end date")
                
            delta = end_date - start_date
            deleted_count = 0
            for i in range(delta.days + 1):
                curr_date_str = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
                success = parking_service.cancel_manager_release(db, manager_id, slot_id, curr_date_str)
                if success:
                    deleted_count += 1
            if deleted_count == 0:
                raise HTTPException(status_code=404, detail="No releases found in the specified range")
            return {"status": "success", "count": deleted_count}
        else:
            raise HTTPException(status_code=400, detail="Date or start_date/end_date must be provided")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
