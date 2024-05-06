import datetime
from typing import Optional
import uuid
from pydantic import BaseModel, EmailStr, StrictStr, validator, Field, Json

class TokenData(BaseModel):
    email: str = None

class Status(BaseModel):
    message: str

class UserBase(BaseModel):
    email: EmailStr
    name: StrictStr

class UserOut(UserBase):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

class UserOutDB(UserOut):
    email: EmailStr
    password: StrictStr

class UserIn(UserBase):
    password: StrictStr

    @validator("password")
    def password_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v

class UserInDB(UserBase):
    id: int
    password: str
    created_at: datetime.datetime
    updated_at: datetime.datetime





class ProtocolBase(BaseModel):
    name: StrictStr
    author: StrictStr
    version: StrictStr
    description: StrictStr

class ProtocolOut(ProtocolBase):
    id: uuid.UUID
    user_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

class ProtocolOutDB(ProtocolOut):
    name: StrictStr
    author: StrictStr
    version: StrictStr
    description: StrictStr

class ProtocolIn(ProtocolBase):
    id: uuid.UUID = None
    pass

class ProtocolInDB(ProtocolBase):
    id: uuid.UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime

class ProtocolUserBase(BaseModel):
    user_id: int
    protocol_id: uuid.UUID

class ProtocolSVG(BaseModel):
    svg: str


class ProtocolEncapsulationBase(BaseModel):
    protocol_id: uuid.UUID
    parent_protocol_id: uuid.UUID

class ProtocolEncapsulationOut(ProtocolEncapsulationBase):
    id: uuid.UUID
    protocol: ProtocolOut
    fields: Optional[Json] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

class ProtocolEncapsulationIn(ProtocolEncapsulationBase):
    pass

class ProtocolEncapsulationPatch(BaseModel):
    fields: Json
