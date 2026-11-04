from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class FormFieldSchema(BaseModel):
    id: str
    label: str
    type: str # text, textarea, select, date, file, number, checkbox
    required: bool
    options: Optional[List[str]] = None
    placeholder: Optional[str] = None

class FormTemplateBase(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    fields: Optional[List[FormFieldSchema]] = []
    isActive: Optional[bool] = True
    detectionType: Optional[str] = "person"  # "person" or "vehicle"

class FormTemplateCreate(FormTemplateBase):
    name: str
    fields: List[FormFieldSchema]
    detectionType: str = "person"

class FormTemplateUpdate(FormTemplateBase):
    pass

class FormTemplateInDBBase(FormTemplateBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True

class FormTemplate(FormTemplateInDBBase):
    pass
