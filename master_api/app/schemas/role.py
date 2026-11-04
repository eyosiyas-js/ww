from typing import List, Optional
from pydantic import BaseModel

class RoleBase(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = []
    isSystem: Optional[bool] = False

class RoleCreate(RoleBase):
    name: str
    permissions: List[str]

class RoleUpdate(RoleBase):
    pass

class RoleInDBBase(RoleBase):
    id: str
    usersCount: int = 0

    class Config:
        from_attributes = True

class Role(RoleInDBBase):
    pass
