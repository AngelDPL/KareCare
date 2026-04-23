from extensions import db
from sqlalchemy import (
    String,
    Enum,
    ForeignKey,
    Numeric,
    DateTime,
    Date,
    CheckConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import generate_password_hash, check_password_hash
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class Admins(db.Model):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(Enum("Admin", name="role_admin"), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )

    def __init__(self, username: str, password: str, role: str = "Admin"):
        self.username = username
        self.role = role
        self.set_password(password)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Businesses(db.Model):
    __tablename__ = "business"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_name: Mapped[str] = mapped_column(String(100))
    business_RIF: Mapped[str] = mapped_column(String(15), unique=True)
    business_CP: Mapped[str] = mapped_column(String(10))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )

    users: Mapped[List["Users"]] = relationship(
        "Users", back_populates="business", cascade="all, delete-orphan"
    )
    services: Mapped[List["Services"]] = relationship(
        "Services", back_populates="business", cascade="all, delete-orphan"
    )
    clients: Mapped[List["Clients"]] = relationship(
        "Clients", back_populates="business", cascade="all, delete-orphan"
    )
    appointments: Mapped[List["Appointments"]] = relationship(
        "Appointments", back_populates="business", cascade="all, delete-orphan"
    )
    calendar_events: Mapped[List["Calendar"]] = relationship(
        "Calendar", back_populates="business", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.business_name,
            "RIF": self.business_RIF,
            "CP": self.business_CP,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Users(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    business_id: Mapped[int] = mapped_column(ForeignKey("business.id"))
    role: Mapped[str] = mapped_column(
        Enum("master", "manager", "employee", name="role_enum")
    )
    security_question: Mapped[str] = mapped_column(String(500))
    security_answer: Mapped[str] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )

    business: Mapped["Businesses"] = relationship("Businesses", back_populates="users")
    appointments: Mapped[List["Appointments"]] = relationship(
        "Appointments", back_populates="user", cascade="all, delete-orphan"
    )

    def __init__(
        self,
        username: str,
        password: str,
        business_id: int,
        security_question: str,
        security_answer: str,
        role: str = "employee",
    ):
        self.username = username
        self.business_id = business_id
        self.role = role
        self.security_question = security_question
        self.security_answer = security_answer
        self.set_password(password)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "business_id": self.business_id,
            "security_question": self.security_question,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Services(db.Model):
    __tablename__ = "service"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("business.id"))
    name: Mapped[str] = mapped_column(String(75))
    description: Mapped[str] = mapped_column(String(500))
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )

    business: Mapped["Businesses"] = relationship(
        "Businesses", back_populates="services"
    )
    appointments: Mapped[List["Appointments"]] = relationship(
        "Appointments", back_populates="service", cascade="all, delete-orphan"
    )
    client_instances: Mapped[List["ClientService"]] = relationship(
        "ClientService", back_populates="service", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "business_id": self.business_id,
            "name": self.name,
            "description": self.description,
            "price": str(self.price),
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Clients(db.Model):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(75))
    address: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(15))
    client_id_number: Mapped[str] = mapped_column(String(20), unique=True)
    client_dni: Mapped[str] = mapped_column(String(20), unique=True)
    email: Mapped[str] = mapped_column(String(100), unique=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("business.id"))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )

    business: Mapped["Businesses"] = relationship(
        "Businesses", back_populates="clients"
    )
    notes: Mapped[List["Notes"]] = relationship(
        "Notes", back_populates="client", cascade="all, delete-orphan"
    )
    payments: Mapped[List["Payments"]] = relationship(
        "Payments", back_populates="client", cascade="all, delete-orphan"
    )
    appointments: Mapped[List["Appointments"]] = relationship(
        "Appointments", back_populates="client", cascade="all, delete-orphan"
    )
    service_history: Mapped[List["ServiceHistory"]] = relationship(
        "ServiceHistory", back_populates="client", cascade="all, delete-orphan"
    )
    service_instances: Mapped[List["ClientService"]] = relationship(
        "ClientService", back_populates="client", cascade="all, delete-orphan"
    )

    def to_dict(self, full=False) -> dict:
        data = {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "phone": self.phone,
            "client_id_number": self.client_id_number,
            "client_dni": self.client_dni,
            "email": self.email,
            "business_id": self.business_id,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if full:
            data["notes"] = [note.to_dict() for note in self.notes]
            data["payments"] = [payment.to_dict() for payment in self.payments]
            data["appointments"] = [appt.to_dict() for appt in self.appointments]
            data["services"] = [s.to_dict() for s in self.service_instances]
        return data


class Notes(db.Model):
    __tablename__ = "note"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    description: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )

    client: Mapped["Clients"] = relationship("Clients", back_populates="notes")
    service_history: Mapped[List["ServiceHistory"]] = relationship(
        "ServiceHistory", back_populates="note", uselist=True
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "client_id": self.client_id,
            "client_name": self.client.name if self.client else None,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Payments(db.Model):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint(
            "payments_made <= estimated_total", name="check_payments_valid"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    payment_method: Mapped[str] = mapped_column(
        Enum("cash", "card", name="payment_method_enum")
    )
    estimated_total: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    payments_made: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    payment_date: Mapped[Optional[Date]] = mapped_column(Date)
    status: Mapped[str] = mapped_column(
        Enum("pending", "paid", name="status_enum"), default="pending"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )

    client: Mapped["Clients"] = relationship("Clients", back_populates="payments")

    def to_dict(self) -> dict:
        pending = max(0, self.estimated_total - self.payments_made)
        return {
            "id": self.id,
            "client_id": self.client_id,
            "payment_method": self.payment_method,
            "estimated_total": str(self.estimated_total),
            "payments_made": str(self.payments_made),
            "pending_payments": str(pending),
            "payment_date": (
                self.payment_date.isoformat() if self.payment_date else None
            ),
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Appointments(db.Model):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    service_id: Mapped[int] = mapped_column(ForeignKey("service.id"))
    business_id: Mapped[int] = mapped_column(ForeignKey("business.id"))
    date_time: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(
        Enum(
            "pending", "confirmed", "cancelled", "completed", name="appointment_status"
        ),
        default="pending",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )

    user: Mapped["Users"] = relationship("Users", back_populates="appointments")
    client: Mapped["Clients"] = relationship("Clients", back_populates="appointments")
    service: Mapped["Services"] = relationship(
        "Services", back_populates="appointments"
    )
    business: Mapped["Businesses"] = relationship(
        "Businesses", back_populates="appointments"
    )
    calendar: Mapped[Optional["Calendar"]] = relationship(
        "Calendar", back_populates="appointment", uselist=False
    )
    service_history: Mapped[List["ServiceHistory"]] = relationship(
        "ServiceHistory", back_populates="appointment", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.username if self.user else None,
            "client_id": self.client_id,
            "client_name": self.client.name if self.client else None,
            "client_email": self.client.email if self.client else None,
            "service_id": self.service_id,
            "service_name": self.service.name if self.service else None,
            "date_time": self.date_time.isoformat(),
            "status": self.status,
            "calendar": self.calendar.to_dict() if self.calendar else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Calendar(db.Model):
    __tablename__ = "calendar"

    id: Mapped[int] = mapped_column(primary_key=True)
    start_date_time: Mapped[datetime] = mapped_column(DateTime)
    end_date_time: Mapped[datetime] = mapped_column(DateTime)
    appointment_id: Mapped[int] = mapped_column(
        ForeignKey("appointments.id"), unique=True
    )
    google_event_id: Mapped[Optional[str]] = mapped_column(String(255))
    last_sync: Mapped[Optional[datetime]] = mapped_column(DateTime)
    business_id: Mapped[Optional[int]] = mapped_column(ForeignKey("business.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )

    appointment: Mapped["Appointments"] = relationship(
        "Appointments", back_populates="calendar"
    )
    business: Mapped[Optional["Businesses"]] = relationship(
        "Businesses", back_populates="calendar_events"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "start_date_time": self.start_date_time.isoformat(),
            "end_date_time": self.end_date_time.isoformat(),
            "appointment_id": self.appointment_id,
            "google_event_id": self.google_event_id,
            "last_sync": self.last_sync.isoformat() if self.last_sync else None,
            "business_id": self.business_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class ServiceHistory(db.Model):
    __tablename__ = "service_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"))
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"))
    note_id: Mapped[Optional[int]] = mapped_column(ForeignKey("note.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    client: Mapped["Clients"] = relationship(
        "Clients", back_populates="service_history"
    )
    appointment: Mapped["Appointments"] = relationship(
        "Appointments", back_populates="service_history"
    )
    note: Mapped[Optional["Notes"]] = relationship(
        "Notes", back_populates="service_history"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "client_id": self.client_id,
            "client_name": self.client.name if self.client else None,
            "appointment_id": self.appointment_id,
            "appointment_info": {
                "date_time": (
                    self.appointment.date_time.isoformat() if self.appointment else None
                ),
                "service": (
                    self.appointment.service.name
                    if self.appointment and self.appointment.service
                    else None
                ),
                "status": self.appointment.status if self.appointment else None,
            },
            "note_id": self.note_id,
            "note_description": self.note.description if self.note else None,
            "created_at": self.created_at.isoformat(),
        }


class ClientService(db.Model):
    __tablename__ = "client_service"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("service.id"), index=True)
    completed: Mapped[bool] = mapped_column(default=False)
    completed_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )

    client: Mapped["Clients"] = relationship(
        "Clients", back_populates="service_instances"
    )
    service: Mapped["Services"] = relationship(
        "Services", back_populates="client_instances"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "client_id": self.client_id,
            "service_id": self.service_id,
            "service_name": self.service.name if self.service else None,
            "service_price": str(self.service.price) if self.service else None,
            "service_description": self.service.description if self.service else None,
            "completed": self.completed,
            "completed_date": (
                self.completed_date.isoformat() if self.completed_date else None
            ),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
