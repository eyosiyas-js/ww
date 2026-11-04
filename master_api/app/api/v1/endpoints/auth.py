from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app import crud, models, schemas
from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.audit import log_login

router = APIRouter()

@router.post("/login", response_model=schemas.Token)
def login_access_token(
    request: Request,
    db: Session = Depends(deps.get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = crud.user.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    # Log successful login
    try:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        log_login(db, user, ip_address=ip_address, user_agent=user_agent)
    except Exception as e:
        # Don't fail login if logging fails
        print(f"Failed to log login: {e}")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "accessToken": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "refreshToken": "ref-" + user.id, # Mock refresh token for now
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "fullName": user.full_name,
            "role": user.role.name if user.role else "User",
            "organizationId": user.organization_id,
            "organizationName": user.organization.name if user.organization else "System",
            "organizationFeatures": user.organization.features if user.organization and getattr(user.organization, "features", None) else {},
            "companyType": getattr(user.organization, "company_type", "general") if user.organization else "general",
            "organizationLat": getattr(user.organization, "lat", None) if user.organization else None,
            "organizationLng": getattr(user.organization, "lng", None) if user.organization else None
        }
    }

@router.post("/refresh", response_model=schemas.Token)
def refresh_token(
    db: Session = Depends(deps.get_db), 
    refresh_token: str = None # In a real app, you'd verify the refresh token
) -> Any:
    """
    Refresh token to get new access token
    """
    # Placeholder logic
    return {"accessToken": "new-token", "token_type": "bearer"}

@router.get("/me")
def read_user_me(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "fullName": current_user.full_name,
        "role": current_user.role.name if current_user.role else "User",
        "organizationId": current_user.organization_id,
        "organizationName": current_user.organization.name if current_user.organization else "System",
        "organizationFeatures": current_user.organization.features if current_user.organization and getattr(current_user.organization, "features", None) else {},
        "companyType": getattr(current_user.organization, "company_type", "general") if current_user.organization else "general",
        "organizationLat": getattr(current_user.organization, "lat", None) if current_user.organization else None,
        "organizationLng": getattr(current_user.organization, "lng", None) if current_user.organization else None
    }
