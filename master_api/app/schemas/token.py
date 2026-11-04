from typing import Optional
from pydantic import BaseModel

class Token(BaseModel):
    accessToken: str
    refreshToken: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[dict] = None # To match frontend response

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class Msg(BaseModel):
    msg: str
