"""
Authentication router — handles login, activation, password reset, password change.
"""
import os
from fastapi import APIRouter, HTTPException, Header, Depends, UploadFile, File
from typing import Optional
from sqlalchemy.orm import Session

from models.schemas import (
    LoginRequest, LoginResponse, User,
    ActivateRequestSchema, ActivateVerifySchema, ActivateCompleteSchema,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest,
)
from services import auth_service
from services.user_service import get_user_by_id
from db import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ─── Dependencies ─────────────────────────────────────────────────────────────

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate the JWT token, return the current user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.split(" ")[1]
    payload = auth_service.verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = get_user_by_id(db, payload.sub)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


def is_hr(user: User) -> bool:
    if not user:
        return False
    return user.role == "hr" or (user.name and user.name.strip().lower() in ["sumanth.v", "vinod. v", "srinivas.k"])


def get_hr_user(user: User = Depends(get_current_user)) -> User:
    """Require HR role."""
    if not is_hr(user):
        raise HTTPException(status_code=403, detail="HR access required")
    return user


# ─── Login ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password, or account not activated.",
        )

    token = auth_service.create_access_token(user)
    return LoginResponse(token=token, user=user)


@router.get("/me", response_model=User)
def get_me(user: User = Depends(get_current_user)):
    return user


@router.post("/activate/request")
def activate_request(request: ActivateRequestSchema, db: Session = Depends(get_db)):
    try:
        return auth_service.request_activation(db, request.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/activate/verify")
def activate_verify(request: ActivateVerifySchema, db: Session = Depends(get_db)):
    try:
        return auth_service.verify_activation_otp(db, request.email, request.otp)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/activate/complete")
def activate_complete(request: ActivateCompleteSchema, db: Session = Depends(get_db)):
    if request.password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    try:
        return auth_service.complete_activation(
            db, request.name, request.email, request.otp, request.password
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
# ─── Forgot Password ─────────────────────────────────────────────────────────

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request a password reset OTP."""
    try:
        result = auth_service.request_password_reset(db, request.email)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using a valid OTP."""
    if request.new_password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long.",
        )

    try:
        result = auth_service.reset_password(
            db, request.email, request.otp, request.new_password
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Change Password ─────────────────────────────────────────────────────────

@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change password for the currently logged-in user."""
    if request.new_password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long.",
        )

    if request.current_password == request.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from the current password.",
        )

    try:
        result = auth_service.change_password(
            db, user.id, request.current_password, request.new_password
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/profile", response_model=User)
def update_profile(
    data: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the currently logged-in user's own profile (name, department, vehicle_number)."""
    # Restrict allowed update fields for self-management
    name = data.get("name", user.name).strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
        
    department = data.get("department", user.department).strip()
    vehicle_number = data.get("vehicle_number", user.vehicle_number).strip().upper()
    mobile_number = data.get("mobile_number", user.mobile_number).strip()
    
    # Calculate avatar initials
    words = [w for w in name.split() if w]
    initials = "".join([w[0] for w in words]).upper()[:2]
    if not initials:
        initials = "US"
        
    update_data = {
        "name": name,
        "department": department,
        "vehicle_number": vehicle_number,
        "mobile_number": mobile_number,
        "avatar_initials": initials
    }
    
    from services import user_service
    updated = user_service.update_user(db, user.id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated


@router.post("/profile/picture", response_model=User)
def upload_profile_picture(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a profile picture for the currently logged-in user."""
    import shutil
    
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
        
    # Get file extension
    file_ext = os.path.splitext(file.filename)[1]
    if file_ext.lower() not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(status_code=400, detail="Invalid image format.")
        
    # Save directory
    os.makedirs("uploads", exist_ok=True)
    filename = f"{user.id}{file_ext}"
    filepath = os.path.join("uploads", filename)
    
    # Write to local disk
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Public URL
    profile_pic_url = f"/uploads/{filename}"
    
    from services import user_service
    updated = user_service.update_user(db, user.id, {"profile_picture_url": profile_pic_url})
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
        
    return updated

