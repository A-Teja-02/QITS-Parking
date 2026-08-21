from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from models.schemas import Floor as FloorSchema, Slot as SlotSchema, ManagerRelease as ManagerReleaseSchema
from db.models import Floor, ParkingSlot, ManagerRelease, Employee, Reservation, Notification

def get_all_floors(db: Session) -> List[FloorSchema]:
    floors = db.query(Floor).order_by(Floor.order).all()
    return [FloorSchema(id=f.id, name=f.name, label=f.label, order=f.order, is_active=f.is_active) for f in floors]

def get_manager_name(db: Session, manager_id: Optional[str]) -> Optional[str]:
    if not manager_id:
        return None
    mgr = db.query(Employee).filter(Employee.id == manager_id).first()
    return mgr.name if mgr else None

def get_manager_role(db: Session, manager_id: Optional[str]) -> Optional[str]:
    if not manager_id:
        return None
    mgr = db.query(Employee).filter(Employee.id == manager_id).first()
    return mgr.role if mgr else None

def get_slots_by_floor(db: Session, floor_id: Optional[str] = None) -> List[SlotSchema]:
    query = db.query(ParkingSlot).order_by(ParkingSlot.position)
    if floor_id:
        query = query.filter(ParkingSlot.floor_id == floor_id)
    slots = query.all()
    return [
        SlotSchema(
            id=s.id,
            label=s.label,
            floor_id=s.floor_id,
            position=s.position,
            status=s.status,
            reserved_for_manager_id=s.reserved_for_manager_id,
            reserved_for_manager_name=get_manager_name(db, s.reserved_for_manager_id),
            reserved_for_manager_role=get_manager_role(db, s.reserved_for_manager_id)
        ) for s in slots
    ]

def create_slot(db: Session, data: dict) -> SlotSchema:
    new_slot = ParkingSlot(
        id=data["id"],
        label=data["label"],
        floor_id=data["floor_id"],
        position=data["position"],
        status=data.get("status", "active"),
        reserved_for_manager_id=data.get("reserved_for_manager_id")
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)
    return SlotSchema(
        id=new_slot.id,
        label=new_slot.label,
        floor_id=new_slot.floor_id,
        position=new_slot.position,
        status=new_slot.status,
        reserved_for_manager_id=new_slot.reserved_for_manager_id,
        reserved_for_manager_name=get_manager_name(db, new_slot.reserved_for_manager_id),
        reserved_for_manager_role=get_manager_role(db, new_slot.reserved_for_manager_id)
    )

def update_slot(db: Session, slot_id: str, data: dict) -> Optional[SlotSchema]:
    slot = db.query(ParkingSlot).filter(ParkingSlot.id == slot_id).first()
    if not slot:
        return None
    for k, v in data.items():
        if k != "id" and hasattr(slot, k):
            setattr(slot, k, v)
    db.commit()
    db.refresh(slot)
    return SlotSchema(
        id=slot.id,
        label=slot.label,
        floor_id=slot.floor_id,
        position=slot.position,
        status=slot.status,
        reserved_for_manager_id=slot.reserved_for_manager_id,
        reserved_for_manager_name=get_manager_name(db, slot.reserved_for_manager_id),
        reserved_for_manager_role=get_manager_role(db, slot.reserved_for_manager_id)
    )

def delete_slot(db: Session, slot_id: str) -> bool:
    slot = db.query(ParkingSlot).filter(ParkingSlot.id == slot_id).first()
    if slot:
        db.query(Reservation).filter(Reservation.slot_id == slot_id).delete()
        db.query(ManagerRelease).filter(ManagerRelease.slot_id == slot_id).delete()
        db.delete(slot)
        db.commit()
        return True
    return False

def set_slot_status(db: Session, slot_id: str, status: str) -> bool:
    slot = db.query(ParkingSlot).filter(ParkingSlot.id == slot_id).first()
    if slot:
        slot.status = status
        db.commit()
        return True
    return False

def set_floor_status(db: Session, floor_id: str, is_active: bool) -> bool:
    floor = db.query(Floor).filter(Floor.id == floor_id).first()
    if floor:
        floor.is_active = is_active
        db.commit()
        return True
    return False

def assign_manager(db: Session, slot_id: str, manager_id: str) -> bool:
    # Check if manager already has a slot, if so, unassign it first
    existing = db.query(ParkingSlot).filter(ParkingSlot.reserved_for_manager_id == manager_id).first()
    if existing:
        existing.reserved_for_manager_id = None
        
    slot = db.query(ParkingSlot).filter(ParkingSlot.id == slot_id).first()
    if slot:
        slot.reserved_for_manager_id = manager_id
        db.commit()
        return True
    return False

def remove_manager(db: Session, slot_id: str) -> bool:
    slot = db.query(ParkingSlot).filter(ParkingSlot.id == slot_id).first()
    if slot:
        slot.reserved_for_manager_id = None
        db.commit()
        return True
    return False

def release_manager_slot(db: Session, manager_id: str, slot_id: str, release_date: str) -> ManagerReleaseSchema:
    # verify manager owns slot
    slot = db.query(ParkingSlot).filter(
        ParkingSlot.id == slot_id, 
        ParkingSlot.reserved_for_manager_id == manager_id
    ).first()
    
    if not slot:
        raise ValueError("Manager does not own this slot")

    # prevent duplicate release
    existing = db.query(ManagerRelease).filter(
        ManagerRelease.slot_id == slot_id,
        ManagerRelease.release_date == release_date
    ).first()
    
    if existing:
        return ManagerReleaseSchema(
            manager_id=existing.manager_id,
            slot_id=existing.slot_id,
            release_date=existing.release_date
        )

    release = ManagerRelease(
        manager_id=manager_id,
        slot_id=slot_id,
        release_date=release_date
    )
    db.add(release)
    db.commit()
    db.refresh(release)
    
    return ManagerReleaseSchema(
        manager_id=release.manager_id,
        slot_id=release.slot_id,
        release_date=release.release_date
    )

def release_manager_slot_range(db: Session, manager_id: str, slot_id: str, start_date_str: str, end_date_str: str) -> List[ManagerReleaseSchema]:
    from datetime import datetime, timedelta
    # verify manager owns slot
    slot = db.query(ParkingSlot).filter(
        ParkingSlot.id == slot_id, 
        ParkingSlot.reserved_for_manager_id == manager_id
    ).first()
    
    if not slot:
        raise ValueError("Manager does not own this slot")

    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError("Invalid date format. Use YYYY-MM-DD")

    if start_date > end_date:
        raise ValueError("Start date must be before or equal to end date")
        
    delta = end_date - start_date
    releases = []
    
    for i in range(delta.days + 1):
        curr_date_str = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        
        # Check if already exists
        existing = db.query(ManagerRelease).filter(
            ManagerRelease.slot_id == slot_id,
            ManagerRelease.release_date == curr_date_str
        ).first()
        
        if not existing:
            release = ManagerRelease(
                manager_id=manager_id,
                slot_id=slot_id,
                release_date=curr_date_str
            )
            db.add(release)
            releases.append(release)
            
    db.commit()
    for r in releases:
        db.refresh(r)
        
    # Return all releases for this range
    all_releases = db.query(ManagerRelease).filter(
        ManagerRelease.slot_id == slot_id,
        ManagerRelease.release_date >= start_date_str,
        ManagerRelease.release_date <= end_date_str
    ).all()
    
    return [
        ManagerReleaseSchema(
            manager_id=r.manager_id,
            slot_id=r.slot_id,
            release_date=r.release_date
        ) for r in all_releases
    ]

def get_reserved_slots(db: Session) -> List[Dict[str, Any]]:
    # Get all slots that have a reserved_for_manager_id
    slots = db.query(ParkingSlot, Employee.name).join(
        Employee, ParkingSlot.reserved_for_manager_id == Employee.id
    ).all()
    
    reserved = []
    for slot, manager_name in slots:
        reserved.append({
            "slot": {
                "id": slot.id,
                "label": slot.label,
                "floor_id": slot.floor_id,
                "position": slot.position,
                "status": slot.status,
                "reserved_for_manager_id": slot.reserved_for_manager_id
            },
            "manager_id": slot.reserved_for_manager_id,
            "manager_name": manager_name,
        })
    return reserved

def get_manager_releases(db: Session, date: str) -> List[ManagerReleaseSchema]:
    releases = db.query(ManagerRelease).filter(ManagerRelease.release_date == date).all()
    return [
        ManagerReleaseSchema(
            manager_id=r.manager_id,
            slot_id=r.slot_id,
            release_date=r.release_date
        ) for r in releases
    ]

def cancel_manager_release(db: Session, manager_id: str, slot_id: str, release_date: str) -> bool:
    # verify manager owns slot
    slot = db.query(ParkingSlot).filter(
        ParkingSlot.id == slot_id, 
        ParkingSlot.reserved_for_manager_id == manager_id
    ).first()
    
    if not slot:
        raise ValueError("Manager does not own this slot")

    release = db.query(ManagerRelease).filter(
        ManagerRelease.manager_id == manager_id,
        ManagerRelease.slot_id == slot_id,
        ManagerRelease.release_date == release_date
    ).first()
    
    if release:
        # Check for any active employee reservation on this slot on this date
        reservation = db.query(Reservation).filter(
            Reservation.slot_id == slot_id,
            Reservation.date == release_date,
            Reservation.status == "active"
        ).first()
        
        if reservation:
            # 1. Cancel the employee's reservation
            reservation.status = "cancelled"
            
            # 2. Get manager's name
            manager = db.query(Employee).filter(Employee.id == manager_id).first()
            manager_name = manager.name if manager else "Manager"
            
            # 3. Format date to dd/mm/yyyy
            parts = release_date.split('-')
            formatted_date = f"{parts[2]}/{parts[1]}/{parts[0]}" if len(parts) == 3 else release_date
            
            # 4. Notify employee in app
            slot_label = f"{slot.label}-{slot.position}" if "-" not in slot.label else slot.label
            message = f"Your reservation on slot {slot_label} for {formatted_date} was reclaimed by {manager_name}. Please book another slot."
            notification = Notification(
                user_id=reservation.user_id,
                message=message
            )
            db.add(notification)
            
        db.delete(release)
        db.commit()
        return True
    return False
