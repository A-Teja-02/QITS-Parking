"""
User management service — uses SQLAlchemy + Supabase PostgreSQL.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from db.models import Employee, PasswordReset, ParkingSlot, Reservation, ManagerRelease, OTPVerification
from models.schemas import User


def _employee_to_user(emp: Employee) -> User:
    """Convert Employee ORM model to User Pydantic schema."""
    return User(
        id=str(emp.id),
        name=emp.name,
        email=emp.email,
        department=emp.department,
        vehicle_number=emp.vehicle_number,
        mobile_number=emp.mobile_number,
        avatar_initials=emp.avatar_initials,
        role=emp.role,
        is_active=emp.is_active,
        account_status=emp.account_status,
        profile_picture_url=emp.profile_picture_url,
        created_at=emp.created_at.isoformat() if emp.created_at else None,
        updated_at=emp.updated_at.isoformat() if emp.updated_at else None,
    )


def get_all_users(db: Session) -> List[User]:
    """Get all employees."""
    employees = db.query(Employee).order_by(Employee.created_at).all()
    return [_employee_to_user(e) for e in employees]


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """Get a single user by ID."""
    emp = db.query(Employee).filter(Employee.id == user_id).first()
    if not emp:
        return None
    return _employee_to_user(emp)


def get_user_name(db: Session, user_id: str) -> str:
    """Get just the user's name — used by parking_service for manager lookups."""
    emp = db.query(Employee).filter(Employee.id == user_id).first()
    return emp.name if emp else "Unknown"


def create_user(db: Session, user_data: dict) -> User:
    """
    Create a new employee (HR action).
    Employee starts with account_status='inactive' and no password.
    """
    # Validate email uniqueness
    existing = db.query(Employee).filter(Employee.email == user_data.get("email", "")).first()
    if existing:
        raise ValueError("A user with this email already exists.")

    now = datetime.now(timezone.utc)

    # Generate avatar initials from name
    name = user_data.get("name", "")
    parts = name.split()
    initials = "".join(p[0].upper() for p in parts[:2]) if parts else "??"

    from services.auth_service import hash_password
    emp = Employee(
        id=str(uuid.uuid4()),
        employee_id=user_data.get("employee_id"),
        name=name,
        email=user_data["email"],
        department=user_data.get("department", ""),
        vehicle_number=user_data.get("vehicle_number", ""),
        avatar_initials=user_data.get("avatar_initials", initials),
        role=user_data.get("role", "employee"),
        is_active=True,
        password_hash=hash_password("password"),
        account_status="active",
        created_at=now,
        updated_at=now,
    )

    db.add(emp)
    db.commit()
    db.refresh(emp)

    return _employee_to_user(emp)


def update_user(db: Session, user_id: str, update_data: dict) -> Optional[User]:
    """Update an employee's profile data (HR action)."""
    emp = db.query(Employee).filter(Employee.id == user_id).first()
    if not emp:
        return None

    allowed_fields = {"name", "email", "department", "vehicle_number", "mobile_number", "avatar_initials", "role", "employee_id", "profile_picture_url"}
    
    old_role = emp.role
    
    for key, value in update_data.items():
        if key in allowed_fields:
            setattr(emp, key, value)

    # If the role was changed from manager to something else, clean up manager assets
    new_role = emp.role
    if old_role == "manager" and new_role != "manager":
        # Unassign manager from any parking slots
        db.query(ParkingSlot).filter(ParkingSlot.reserved_for_manager_id == user_id).update(
            {ParkingSlot.reserved_for_manager_id: None}
        )
        # Clean up manager releases
        db.query(ManagerRelease).filter(ManagerRelease.manager_id == user_id).delete()

    emp.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(emp)

    return _employee_to_user(emp)


def toggle_user_status(db: Session, user_id: str, is_active: bool) -> bool:
    """Activate or deactivate an employee (HR action)."""
    emp = db.query(Employee).filter(Employee.id == user_id).first()
    if not emp:
        return False

    emp.is_active = is_active
    emp.updated_at = datetime.now(timezone.utc)
    db.commit()

    return True


def delete_user(db: Session, user_id: str) -> bool:
    """Delete an employee (HR action)."""
    emp = db.query(Employee).filter(Employee.id == user_id).first()
    if not emp:
        return False

    # 1. Clean up password resets & OTPs
    db.query(PasswordReset).filter(PasswordReset.employee_id == user_id).delete()
    db.query(OTPVerification).filter(OTPVerification.email == emp.email).delete()

    # 2. Unassign this manager from any parking slots
    db.query(ParkingSlot).filter(ParkingSlot.reserved_for_manager_id == user_id).update(
        {ParkingSlot.reserved_for_manager_id: None}
    )

    # 3. Clean up manager releases
    db.query(ManagerRelease).filter(ManagerRelease.manager_id == user_id).delete()

    # 4. Clean up reservations
    db.query(Reservation).filter(
        (Reservation.user_id == user_id) | (Reservation.reserved_by == user_id)
    ).delete()

    # 5. Delete employee
    db.delete(emp)
    db.commit()

    return True
