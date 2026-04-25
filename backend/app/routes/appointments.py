from flask import Blueprint, jsonify, request
from sqlalchemy import select
from extensions import db
from app.models import Appointments, Users, Clients, Services, Businesses, Calendar
from app.utils.decorators import admin_required, user_or_admin_required
from datetime import datetime, timedelta

appointments_bp = Blueprint("appointments", __name__, url_prefix="/api/appointments")


# ============================================================================
# GET - Obtener todas las citas
# ============================================================================
@appointments_bp.route("", methods=["GET"])
@user_or_admin_required
def get_all_appointments():
    try:
        appointments = db.session.execute(select(Appointments)).scalars().all()
        return jsonify([a.to_dict() for a in appointments]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener citas por negocio
# ============================================================================
@appointments_bp.route("/business/<int:business_id>", methods=["GET"])
@user_or_admin_required
def get_appointments_by_business(business_id):
    try:
        business = db.session.get(Businesses, business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        appointments = (
            db.session.execute(
                select(Appointments).where(Appointments.business_id == business_id)
            )
            .scalars()
            .all()
        )
        return jsonify([a.to_dict() for a in appointments]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener citas por usuario
# ============================================================================
@appointments_bp.route("/user/<int:user_id>", methods=["GET"])
@user_or_admin_required
def get_appointments_by_user(user_id):
    try:
        user = db.session.get(Users, user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        appointments = (
            db.session.execute(
                select(Appointments).where(Appointments.user_id == user_id)
            )
            .scalars()
            .all()
        )
        return jsonify([a.to_dict() for a in appointments]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener citas por cliente
# ============================================================================
@appointments_bp.route("/client/<int:client_id>", methods=["GET"])
@user_or_admin_required
def get_appointments_by_client(client_id):
    try:
        client = db.session.get(Clients, client_id)
        if not client:
            return jsonify({"error": "Cliente no encontrado"}), 404

        appointments = (
            db.session.execute(
                select(Appointments).where(Appointments.client_id == client_id)
            )
            .scalars()
            .all()
        )
        return jsonify([a.to_dict() for a in appointments]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener una cita por ID
# ============================================================================
@appointments_bp.route("/<int:appointment_id>", methods=["GET"])
@user_or_admin_required
def get_appointment(appointment_id):
    try:
        appointment = db.session.get(Appointments, appointment_id)
        if not appointment:
            return jsonify({"error": "Cita no encontrada"}), 404
        return jsonify(appointment.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Crear cita (crea el evento de calendario automáticamente)
# ============================================================================
@appointments_bp.route("", methods=["POST"])
@user_or_admin_required
def create_appointment():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "El body no puede estar vacío"}), 400

        required_fields = [
            "user_id",
            "client_id",
            "service_id",
            "business_id",
            "date_time",
        ]
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Campos requeridos faltantes: {missing}"}), 400

        user = db.session.get(Users, data["user_id"])
        if not user or not user.is_active:
            return jsonify({"error": "Usuario no encontrado o inactivo"}), 404

        client = db.session.get(Clients, data["client_id"])
        if not client or not client.is_active:
            return jsonify({"error": "Cliente no encontrado o inactivo"}), 404

        service = db.session.get(Services, data["service_id"])
        if not service or not service.is_active:
            return jsonify({"error": "Servicio no encontrado o inactivo"}), 404

        business = db.session.get(Businesses, data["business_id"])
        if not business or not business.is_active:
            return jsonify({"error": "Negocio no encontrado o inactivo"}), 404

        try:
            date_time = datetime.fromisoformat(data["date_time"])
        except Exception:
            return (
                jsonify(
                    {"error": "Formato de fecha inválido. Usa: YYYY-MM-DDTHH:MM:SS"}
                ),
                400,
            )

        if date_time <= datetime.now():
            return jsonify({"error": "La cita debe ser en el futuro"}), 400

        conflict = db.session.execute(
            select(Appointments).where(
                Appointments.user_id == data["user_id"],
                Appointments.date_time == date_time,
                Appointments.status.in_(["pending", "confirmed"]),
            )
        ).first()
        if conflict:
            return (
                jsonify({"error": "El usuario ya tiene una cita en ese horario"}),
                409,
            )

        appointment = Appointments(
            user_id=data["user_id"],
            client_id=data["client_id"],
            service_id=data["service_id"],
            business_id=data["business_id"],
            date_time=date_time,
            status=data.get("status", "pending"),
        )
        db.session.add(appointment)
        db.session.flush()

        duration = data.get("duration_hours", 1)
        end_time = date_time + timedelta(hours=duration)

        calendar_event = Calendar(
            appointment_id=appointment.id,
            business_id=data["business_id"],
            start_date_time=date_time,
            end_date_time=end_time,
        )
        db.session.add(calendar_event)
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Cita creada y evento de calendario generado",
                    "appointment": appointment.to_dict(),
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PUT - Actualizar cita
# ============================================================================
@appointments_bp.route("/<int:appointment_id>", methods=["PUT"])
@user_or_admin_required
def update_appointment(appointment_id):
    try:
        appointment = db.session.get(Appointments, appointment_id)
        if not appointment:
            return jsonify({"error": "Cita no encontrada"}), 404

        data = request.json
        if not data:
            return jsonify({"error": "El body no puede estar vacío"}), 400

        if "date_time" in data:
            try:
                date_time = datetime.fromisoformat(data["date_time"])
            except Exception:
                return (
                    jsonify(
                        {"error": "Formato de fecha inválido. Usa: YYYY-MM-DDTHH:MM:SS"}
                    ),
                    400,
                )

            if date_time <= datetime.now():
                return jsonify({"error": "La cita debe ser en el futuro"}), 400

            appointment.date_time = date_time

            if appointment.calendar:
                duration = (
                    appointment.calendar.end_date_time
                    - appointment.calendar.start_date_time
                )
                appointment.calendar.start_date_time = date_time
                appointment.calendar.end_date_time = date_time + duration

        if "status" in data:
            valid_statuses = ["pending", "confirmed", "cancelled", "completed"]
            if data["status"] not in valid_statuses:
                return (
                    jsonify({"error": f"Estado inválido. Debe ser: {valid_statuses}"}),
                    400,
                )
            appointment.status = data["status"]

        db.session.commit()
        return jsonify(appointment.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# DELETE - Cancelar cita
# ============================================================================
@appointments_bp.route("/<int:appointment_id>", methods=["DELETE"])
@user_or_admin_required
def delete_appointment(appointment_id):
    try:
        appointment = db.session.get(Appointments, appointment_id)
        if not appointment:
            return jsonify({"error": "Cita no encontrada"}), 404

        appointment.status = "cancelled"
        db.session.commit()

        return jsonify({"message": "Cita cancelada correctamente"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Filtrar citas por fecha
# ============================================================================
@appointments_bp.route("/filter/date", methods=["GET"])
@user_or_admin_required
def filter_by_date():
    try:
        date_str = request.args.get("date")
        if not date_str:
            return jsonify({"error": "El parámetro 'date' es requerido"}), 400

        try:
            date = datetime.fromisoformat(date_str).date()
        except Exception:
            return jsonify({"error": "Formato inválido. Usa: YYYY-MM-DD"}), 400

        appointments = (
            db.session.execute(
                select(Appointments).where(db.func.date(Appointments.date_time) == date)
            )
            .scalars()
            .all()
        )

        return jsonify([a.to_dict() for a in appointments]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Filtrar citas por rango de fechas
# ============================================================================
@appointments_bp.route("/filter/date-range", methods=["GET"])
@user_or_admin_required
def filter_by_date_range():
    try:
        start_str = request.args.get("start")
        end_str = request.args.get("end")

        if not start_str or not end_str:
            return (
                jsonify({"error": "Los parámetros 'start' y 'end' son requeridos"}),
                400,
            )

        try:
            start = datetime.fromisoformat(start_str)
            end = datetime.fromisoformat(end_str)
        except Exception:
            return jsonify({"error": "Formato inválido. Usa: YYYY-MM-DDTHH:MM:SS"}), 400

        if start > end:
            return (
                jsonify({"error": "La fecha inicio no puede ser mayor que la de fin"}),
                400,
            )

        appointments = (
            db.session.execute(
                select(Appointments).where(
                    Appointments.date_time >= start, Appointments.date_time <= end
                )
            )
            .scalars()
            .all()
        )

        return jsonify([a.to_dict() for a in appointments]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Próximas citas
# ============================================================================
@appointments_bp.route("/upcoming", methods=["GET"])
@user_or_admin_required
def get_upcoming():
    try:
        days = request.args.get("days", default=7, type=int)
        if days < 1:
            return jsonify({"error": "El parámetro 'days' debe ser mayor a 0"}), 400

        now = datetime.now()
        future = now + timedelta(days=days)

        appointments = (
            db.session.execute(
                select(Appointments)
                .where(
                    Appointments.date_time >= now,
                    Appointments.date_time <= future,
                    Appointments.status.in_(["pending", "confirmed"]),
                )
                .order_by(Appointments.date_time.asc())
            )
            .scalars()
            .all()
        )

        return jsonify([a.to_dict() for a in appointments]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Estadísticas de citas
# ============================================================================
@appointments_bp.route("/stats", methods=["GET"])
@admin_required
def get_stats():
    try:
        appointments = db.session.execute(select(Appointments)).scalars().all()

        return (
            jsonify(
                {
                    "total": len(appointments),
                    "pending": sum(1 for a in appointments if a.status == "pending"),
                    "confirmed": sum(
                        1 for a in appointments if a.status == "confirmed"
                    ),
                    "completed": sum(
                        1 for a in appointments if a.status == "completed"
                    ),
                    "cancelled": sum(
                        1 for a in appointments if a.status == "cancelled"
                    ),
                    "completion_rate": round(
                        (
                            sum(1 for a in appointments if a.status == "completed")
                            / len(appointments)
                            * 100
                            if appointments
                            else 0
                        ),
                        2,
                    ),
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
