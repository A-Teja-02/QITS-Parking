"""
Authentication service — production-ready with SQLAlchemy + Supabase PostgreSQL.
Handles: login, token management, activation (first-time signup), password reset, password change.
"""
import jwt
import bcrypt
import random
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from config import settings
from db.models import Employee, OTPVerification, PasswordReset
from models.schemas import User
from services.email_service import send_otp_email


# ─── Password Hashing ────────────────────────────────────────────────────────

def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except (ValueError, AttributeError):
        return False


# ─── Employee → User conversion ──────────────────────────────────────────────

def _employee_to_user(emp: Employee) -> User:
    """Convert an Employee ORM object to a User Pydantic schema (no password_hash)."""
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


# ─── JWT Token Management ────────────────────────────────────────────────────

def create_access_token(user: User) -> str:
    """Create a JWT access token for the given user."""
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    payload = {
        "sub": user.id,
        "role": user.role,
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token. Returns payload dict or None."""
    try:
        from models.schemas import TokenPayload
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return TokenPayload(**payload)
    except jwt.PyJWTError:
        return None


# ─── Authentication ──────────────────────────────────────────────────────────

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Authenticate user by email and password.
    Returns User object on success, None on failure.
    """
    emp = db.query(Employee).filter(Employee.email == email).first()
    if not emp:
        return None

    # Account must be active
    if emp.account_status != "active":
        return None

    # HR can deactivate users
    if not emp.is_active:
        return None

    # Must have a password set (activated)
    if not emp.password_hash:
        return None

    if not verify_password(password, emp.password_hash):
        return None

    return _employee_to_user(emp)


# ─── OTP Generation ──────────────────────────────────────────────────────────

def _generate_otp() -> str:
    """Generate a secure 6-digit OTP."""
    return str(random.randint(100000, 999999))


# ─── Account Activation (First-Time Signup) ──────────────────────────────────

def request_activation(db: Session, email: str) -> dict:
    """
    Step 1 of activation: Validate email and send OTP.

    Validates:
    - Email domain is @quadrantitservices.com
    - Email exists in employees table (HR pre-registered)
    - Account is not already activated
    """
    # Validate email domain
    allowed_domain = settings.ALLOWED_EMAIL_DOMAIN
    if not email.endswith(f"@{allowed_domain}"):
        raise ValueError(f"Only @{allowed_domain} emails are allowed.")

    # Find employee by email
    emp = db.query(Employee).filter(Employee.email == email).first()
    if emp:
        raise ValueError("This account is already activated. Please log in.")

    # Invalidate any previous OTPs for this email + purpose
    db.query(OTPVerification).filter(
        OTPVerification.email == email,
        OTPVerification.purpose == "activation",
        OTPVerification.verified == False,
    ).update({"verified": True})

    # Generate and store OTP
    otp = _generate_otp()
    otp_record = OTPVerification(
        email=email,
        otp=otp,
        purpose="activation",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
        verified=False,
    )
    db.add(otp_record)
    db.commit()

    # Send OTP via email service
    dev_otp = send_otp_email(email, otp, "activation")

    result = {"message": "OTP has been sent to your email address."}

    return result


def verify_activation_otp(db: Session, email: str, otp: str) -> dict:
    """
    Step 2 of activation: Verify the 6-digit OTP.
    """
    now = datetime.now(timezone.utc)

    otp_record = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == email,
            OTPVerification.otp == otp,
            OTPVerification.purpose == "activation",
            OTPVerification.verified == False,
            OTPVerification.expires_at > now,
        )
        .order_by(OTPVerification.created_at.desc())
        .first()
    )

    if not otp_record:
        raise ValueError("Invalid or expired OTP. Please request a new one.")

    # Mark as verified (but don't consume yet — that happens on password set)
    return {"message": "OTP verified successfully. Please set your password."}


def complete_activation(db: Session, name: str, email: str, otp: str, password: str) -> dict:
    """
    Step 3 of activation: Set password and activate account.
    Verifies OTP again to prevent tampering.
    """
    now = datetime.now(timezone.utc)

    # Re-verify OTP
    otp_record = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == email,
            OTPVerification.otp == otp,
            OTPVerification.purpose == "activation",
            OTPVerification.verified == False,
            OTPVerification.expires_at > now,
        )
        .order_by(OTPVerification.created_at.desc())
        .first()
    )

    if not otp_record:
        raise ValueError("Invalid or expired OTP. Please restart the activation process.")

    # Ensure employee does not already exist
    emp = db.query(Employee).filter(Employee.email == email).first()
    if emp:
        raise ValueError("This account is already activated. Please log in.")

    avatar_initials = "".join([p[0].upper() for p in name.split()])[:2]

    # Create new employee
    emp = Employee(
        name=name,
        email=email,
        password_hash=hash_password(password),
        account_status="active",
        is_active=True,
        role="employee",
        department="",
        vehicle_number="",
        avatar_initials=avatar_initials
    )
    db.add(emp)

    # Mark OTP as used
    otp_record.verified = True

    db.commit()

    return {"message": "Account activated successfully. You can now log in."}


# ─── Forgot Password ─────────────────────────────────────────────────────────

def request_password_reset(db: Session, email: str) -> dict:
    """
    Generate and send a password reset OTP.
    """
    # Find employee (don't reveal if email doesn't exist)
    emp = db.query(Employee).filter(Employee.email == email).first()
    if not emp:
        # Generic message to prevent email enumeration
        return {
            "message": "If this email is registered, you will receive a password reset code.",
        }

    if emp.account_status != "active":
        return {
            "message": "If this email is registered, you will receive a password reset code.",
        }

    # Invalidate previous reset OTPs
    db.query(PasswordReset).filter(
        PasswordReset.employee_id == emp.id,
        PasswordReset.verified == False,
    ).update({"verified": True})

    # Generate OTP
    otp = _generate_otp()
    reset_record = PasswordReset(
        employee_id=emp.id,
        otp=otp,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
        verified=False,
    )
    db.add(reset_record)
    db.commit()

    # Send OTP
    dev_otp = send_otp_email(email, otp, "password_reset")

    result = {"message": "If this email is registered, you will receive a password reset code."}

    return result


def reset_password(db: Session, email: str, otp: str, new_password: str) -> dict:
    """
    Reset password using a valid OTP.
    """
    emp = db.query(Employee).filter(Employee.email == email).first()
    if not emp:
        raise ValueError("Invalid email or reset code.")

    now = datetime.now(timezone.utc)

    # Find valid, unexpired, unused OTP
    reset_record = (
        db.query(PasswordReset)
        .filter(
            PasswordReset.employee_id == emp.id,
            PasswordReset.otp == otp,
            PasswordReset.verified == False,
            PasswordReset.expires_at > now,
        )
        .order_by(PasswordReset.created_at.desc())
        .first()
    )

    if not reset_record:
        raise ValueError("Invalid or expired reset code. Please request a new one.")

    # Update password
    emp.password_hash = hash_password(new_password)
    emp.account_status = "active"
    emp.is_active = True
    emp.updated_at = now

    # Mark OTP as used
    reset_record.verified = True

    db.commit()

    return {"message": "Password has been reset successfully. You can now log in."}


# ─── Change Password ─────────────────────────────────────────────────────────

def change_password(db: Session, user_id: str, current_password: str, new_password: str) -> dict:
    """
    Change password for an authenticated user.
    """
    emp = db.query(Employee).filter(Employee.id == user_id).first()
    if not emp:
        raise ValueError("User not found.")

    if not emp.password_hash or not verify_password(current_password, emp.password_hash):
        raise ValueError("Current password is incorrect.")

    emp.password_hash = hash_password(new_password)
    emp.updated_at = datetime.now(timezone.utc)

    db.commit()

    return {"message": "Password changed successfully."}
