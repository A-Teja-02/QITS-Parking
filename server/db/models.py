"""
SQLAlchemy ORM models for authentication tables.
Parking tables remain in db.json — only auth lives in the database.

Uses String-based UUIDs for SQLite compatibility during local development.
When deploying to PostgreSQL, these map to VARCHAR columns (still works fine).
"""
import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Boolean, DateTime, ForeignKey, Text, Integer, Index
)
from sqlalchemy.sql import text
from db import Base
from config import settings


def utcnow():
    return datetime.now(timezone.utc)


def new_uuid():
    return str(uuid.uuid4())


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String(36), primary_key=True, default=new_uuid)
    employee_id = Column(String(50), nullable=True, comment="HR-assigned employee ID")
    name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=True)  # NULL until activation
    role = Column(String(20), nullable=False, default="employee")  # employee, manager, hr
    department = Column(String(100), nullable=False, default="")
    vehicle_number = Column(String(50), nullable=False, default="")
    mobile_number = Column(String(20), nullable=False, default="")
    avatar_initials = Column(String(5), nullable=False, default="")
    account_status = Column(String(20), nullable=False, default="inactive")  # inactive, active
    is_active = Column(Boolean, nullable=False, default=True)  # HR can deactivate
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    def __repr__(self):
        return f"<Employee {self.name} ({self.email})>"


class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(String(36), primary_key=True, default=new_uuid)
    email = Column(String(255), nullable=False, index=True)
    otp = Column(String(6), nullable=False)
    purpose = Column(String(30), nullable=False)  # 'activation' or 'password_reset'
    expires_at = Column(DateTime, nullable=False)
    verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    def __repr__(self):
        return f"<OTPVerification {self.email} ({self.purpose})>"


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(String(36), primary_key=True, default=new_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    otp = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    def __repr__(self):
        return f"<PasswordReset employee={self.employee_id}>"


class Floor(Base):
    __tablename__ = "floors"

    id = Column(String(50), primary_key=True)
    name = Column(String(50), nullable=False)
    label = Column(String(10), nullable=False)
    order = Column(Integer, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    def __repr__(self):
        return f"<Floor {self.name}>"


class ParkingSlot(Base):
    __tablename__ = "parking_slots"

    id = Column(String(50), primary_key=True)
    label = Column(String(50), nullable=False)
    floor_id = Column(String(50), ForeignKey("floors.id"), nullable=False)
    position = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="active")
    reserved_for_manager_id = Column(String(36), ForeignKey("employees.id"), nullable=True)

    def __repr__(self):
        return f"<ParkingSlot {self.id}>"


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(String(36), primary_key=True, default=new_uuid)
    user_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    user_name = Column(String(200), nullable=False)
    slot_id = Column(String(50), ForeignKey("parking_slots.id"), nullable=False)
    vehicle_number = Column(String(50), nullable=False)
    date = Column(String(20), nullable=False)  # ISO format string YYYY-MM-DD
    created_at = Column(DateTime, default=utcnow, nullable=False)
    reserved_by = Column(String(36), ForeignKey("employees.id"), nullable=False)
    status = Column(String(20), nullable=False, default="active")

    __table_args__ = (
        Index(
            "idx_unique_active_slot_date",
            "slot_id",
            "date",
            unique=not (settings.DATABASE_URL.startswith("mysql") or os.getenv("IS_MIGRATION_TO_MYSQL") == "true"),
            postgresql_where=text("status = 'active'"),
            sqlite_where=text("status = 'active'")
        ),
        Index(
            "idx_unique_active_user_date",
            "user_id",
            "date",
            unique=not (settings.DATABASE_URL.startswith("mysql") or os.getenv("IS_MIGRATION_TO_MYSQL") == "true"),
            postgresql_where=text("status = 'active'"),
            sqlite_where=text("status = 'active'")
        ),
    )

    def __repr__(self):
        return f"<Reservation {self.id} for {self.user_id} on {self.date}>"


class ManagerRelease(Base):
    __tablename__ = "manager_releases"

    id = Column(String(36), primary_key=True, default=new_uuid)
    manager_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    slot_id = Column(String(50), ForeignKey("parking_slots.id"), nullable=False)
    release_date = Column(String(20), nullable=False)  # ISO format string YYYY-MM-DD

    def __repr__(self):
        return f"<ManagerRelease {self.slot_id} on {self.release_date}>"

