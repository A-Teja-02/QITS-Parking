import uuid
from datetime import datetime, date, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from models.schemas import Reservation as ReservationSchema, ReservationCreate, NotificationSchema
from db.models import Reservation, ParkingSlot, ManagerRelease, Notification

def get_tomorrow_date() -> str:
    today_weekday = date.today().weekday()
    if today_weekday == 4: # Friday -> Monday (today + 3)
        tomorrow = date.today() + timedelta(days=3)
    elif today_weekday == 5: # Saturday -> Monday (today + 2)
        tomorrow = date.today() + timedelta(days=2)
    elif today_weekday == 6: # Sunday -> Monday (today + 1)
        tomorrow = date.today() + timedelta(days=1)
    else:
        tomorrow = date.today() + timedelta(days=1)
    return tomorrow.isoformat()

def is_weekend() -> bool:
    # Booking is open 24/7 (Friday-Sunday books for Monday)
    return False

def get_reservations_by_date(db: Session, reservation_date: str) -> List[ReservationSchema]:
    reservations = db.query(Reservation).filter(
        Reservation.date == reservation_date,
        Reservation.status == "active"
    ).all()
    
    return [
        ReservationSchema(
            id=r.id,
            user_id=r.user_id,
            user_name=r.user_name,
            slot_id=r.slot_id,
            vehicle_number=r.vehicle_number,
            date=r.date,
            created_at=r.created_at.isoformat(),
            reserved_by=r.reserved_by,
            status=r.status
        ) for r in reservations
    ]

def get_reservation_by_user_and_date(db: Session, user_id: str, reservation_date: str) -> Optional[ReservationSchema]:
    r = db.query(Reservation).filter(
        Reservation.user_id == user_id,
        Reservation.date == reservation_date,
        Reservation.status == "active"
    ).first()
    
    if r:
        return ReservationSchema(
            id=r.id,
            user_id=r.user_id,
            user_name=r.user_name,
            slot_id=r.slot_id,
            vehicle_number=r.vehicle_number,
            date=r.date,
            created_at=r.created_at.isoformat(),
            reserved_by=r.reserved_by,
            status=r.status
        )
    return None

def create_reservation(db: Session, data: ReservationCreate, override_role: str = None) -> ReservationSchema:
    tomorrow = get_tomorrow_date()
    today = date.today().isoformat()
    
    # If not HR, enforce today/tomorrow rule and no weekends
    if override_role != "hr":
        if is_weekend():
            raise ValueError("Reservations are only allowed from Sunday to Thursday.")
        if data.date not in (tomorrow, today):
            raise ValueError("Reservations can only be made for today or tomorrow.")
        data_dt = date.fromisoformat(data.date)
        if data_dt.weekday() in (5, 6):
            raise ValueError("No reservations on weekends.")
            
        existing = get_reservation_by_user_and_date(db, data.user_id, data.date)
        if existing:
            raise ValueError("You already have a reservation for this date.")

    # ---------------------------------------------------------
    # CONCURRENCY CONTROL: Lock the specific slot row.
    # ---------------------------------------------------------
    # with_for_update() ensures that if two users try to book the exact same slot
    # simultaneously, the second user will wait here until the first user's 
    # transaction finishes.
    target_slot = db.query(ParkingSlot).filter(ParkingSlot.id == data.slot_id).with_for_update().first()
    
    if not target_slot:
        raise ValueError("Invalid slot.")
        
    if target_slot.status != "active":
        raise ValueError("Slot is not available.")

    if target_slot.reserved_for_manager_id:
        # Check if it's released for that day
        release = db.query(ManagerRelease).filter(
            ManagerRelease.slot_id == data.slot_id,
            ManagerRelease.release_date == data.date
        ).first()
        
        is_released = (release is not None)
        if not is_released and override_role != "hr":
            raise ValueError("This slot is reserved for a manager.")

    # Check if someone else took it while we were waiting for the lock
    existing_reservation = db.query(Reservation).filter(
        Reservation.slot_id == data.slot_id,
        Reservation.date == data.date,
        Reservation.status == "active"
    ).first()
    
    if existing_reservation:
        raise ValueError(f"Slot {data.slot_id} is already reserved.")

    # Safe to create
    new_reservation = Reservation(
        id=str(uuid.uuid4()),
        user_id=data.user_id,
        user_name=data.user_name,
        slot_id=data.slot_id,
        vehicle_number=data.vehicle_number,
        date=data.date,
        created_at=datetime.utcnow(),
        reserved_by=data.reserved_by or data.user_id,
        status="active"
    )

    db.add(new_reservation)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("This slot was just booked or you already have a reservation for this date.")
        
    db.refresh(new_reservation)
    return ReservationSchema(
        id=new_reservation.id,
        user_id=new_reservation.user_id,
        user_name=new_reservation.user_name,
        slot_id=new_reservation.slot_id,
        vehicle_number=new_reservation.vehicle_number,
        date=new_reservation.date,
        created_at=new_reservation.created_at.isoformat(),
        reserved_by=new_reservation.reserved_by,
        status=new_reservation.status
    )

def cancel_reservation(db: Session, reservation_id: str, user_id: str, role: str) -> bool:
    r = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if r:
        if role == "hr" or r.user_id == user_id:
            r.status = "cancelled"
            db.commit()
            return True
    return False

def get_user_history(db: Session, user_id: str) -> List[ReservationSchema]:
    reservations = db.query(Reservation).filter(Reservation.user_id == user_id).all()
    return [
        ReservationSchema(
            id=r.id,
            user_id=r.user_id,
            user_name=r.user_name,
            slot_id=r.slot_id,
            vehicle_number=r.vehicle_number,
            date=r.date,
            created_at=r.created_at.isoformat(),
            reserved_by=r.reserved_by,
            status=r.status
        ) for r in reservations
    ]

def get_all_reservations(db: Session) -> List[ReservationSchema]:
    reservations = db.query(Reservation).filter(Reservation.status == "active").all()
    return [
        ReservationSchema(
            id=r.id,
            user_id=r.user_id,
            user_name=r.user_name,
            slot_id=r.slot_id,
            vehicle_number=r.vehicle_number,
            date=r.date,
            created_at=r.created_at.isoformat(),
            reserved_by=r.reserved_by,
            status=r.status
        ) for r in reservations
    ]


def get_unread_notifications(db: Session, user_id: str) -> List[NotificationSchema]:
    notifications = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.is_read == False
    ).order_by(Notification.created_at.desc()).all()
    
    return [
        NotificationSchema(
            id=n.id,
            user_id=n.user_id,
            message=n.message,
            is_read=n.is_read,
            created_at=n.created_at.isoformat()
        ) for n in notifications
    ]


def mark_notification_read(db: Session, user_id: str, notification_id: str) -> bool:
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).first()
    if notification:
        notification.is_read = True
        db.commit()
        return True
    return False

