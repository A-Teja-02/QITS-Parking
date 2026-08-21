from pydantic import BaseModel
from typing import Optional

# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class ActivateRequestSchema(BaseModel):
    """Step 1: Employee enters their company email to start activation."""
    email: str

class ActivateVerifySchema(BaseModel):
    """Step 2: Employee enters the 6-digit OTP."""
    email: str
    otp: str

class ActivateCompleteSchema(BaseModel):
    """Step 3: Employee sets their password."""
    name: str
    email: str
    otp: str
    password: str
    confirm_password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str
    confirm_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

class HRCreateEmployeeSchema(BaseModel):
    """HR creates a new employee. Account starts as inactive."""
    name: str
    email: str
    department: str = ""
    role: str = "employee"
    vehicle_number: str = ""
    employee_id: Optional[str] = None

class TokenPayload(BaseModel):
    sub: str
    role: str
    exp: int

class User(BaseModel):
    id: str
    name: str
    email: str
    department: str
    vehicle_number: str
    mobile_number: str = ""
    avatar_initials: str
    role: str
    is_active: bool
    account_status: str = "inactive"
    profile_picture_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class LoginResponse(BaseModel):
    token: str
    user: User

# ─── Parking Schemas (UNTOUCHED) ─────────────────────────────────────────────

class Floor(BaseModel):
    id: str
    name: str
    label: str
    order: int
    is_active: bool = True

class Slot(BaseModel):
    id: str
    label: str
    floor_id: str
    position: int
    status: str
    reserved_for_manager_id: Optional[str] = None
    reserved_for_manager_name: Optional[str] = None
    reserved_for_manager_role: Optional[str] = None

class ReservationCreate(BaseModel):
    user_id: str
    user_name: str
    slot_id: str
    vehicle_number: str
    date: str  # ISO format: YYYY-MM-DD
    reserved_by: Optional[str] = None

class Reservation(BaseModel):
    id: str
    user_id: str
    user_name: str
    slot_id: str
    vehicle_number: str
    date: str
    created_at: str
    reserved_by: str
    status: str

class ManagerRelease(BaseModel):
    manager_id: str
    slot_id: str
    release_date: str
