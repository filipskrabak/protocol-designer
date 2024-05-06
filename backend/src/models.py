from sqlalchemy import Date, DateTime, Enum, Integer, String, ForeignKey
import enum
from sqlalchemy.sql.schema import Column
from src.database import Base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, backref
import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    email = Column(String(254), unique=True, nullable=True)
    name = Column(String(128), nullable=True)
    password = Column(String(128), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.now())
    updated_at = Column(DateTime, nullable=False, default=datetime.datetime.now())

class Protocol(Base):
    __tablename__ = "protocols"

    id = Column(UUID(as_uuid=True), server_default="gen_random_uuid()", primary_key=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    author = Column(String, nullable=False)
    version = Column(String, nullable=False)
    description = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.now())
    updated_at = Column(DateTime, nullable=False, default=datetime.datetime.now())

    user = relationship("User", backref=backref("protocols", cascade="all, delete-orphan"))

class ProtocolEncapsulation(Base):
    __tablename__ = "protocol_encapsulations"

    id = Column(UUID(as_uuid=True), server_default="gen_random_uuid()", primary_key=True, index=True, nullable=False)
    protocol_id = Column(UUID(as_uuid=True), ForeignKey("protocols.id"), nullable=False)
    parent_protocol_id = Column(UUID(as_uuid=True), ForeignKey("protocols.id"), nullable=False)
    fields = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.now())
    updated_at = Column(DateTime, nullable=False, default=datetime.datetime.now())

    protocol = relationship("Protocol", backref=backref("protocol", cascade="all, delete-orphan"), uselist=False, foreign_keys=[protocol_id])
    parent_protocol = relationship("Protocol", backref=backref("parent", cascade="all, delete-orphan"), uselist=False, foreign_keys=[parent_protocol_id])
