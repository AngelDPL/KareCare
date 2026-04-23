from flask import Blueprint, jsonify, request
from sqlalchemy import select
from extensions import db
from app.models import Calendar, Appointments, Businesses
from app.utils.decorators import admin_required, user_or_admin_required
from datetime import datetime
import requests as http_requests

calendar_bp = Blueprint("calendar", __name__, url_prefix="/api/calendar")


# ============================================================================
# GET - Obtener todos los eventos
# ============================================================================
@calendar_bp.route("", methods=["GET"])
@user_or_admin_required
def get_all_events():
    try:
        events = db.session.execute(select(Calendar)).scalars().all()
        return jsonify([e.to_dict() for e in events]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener eventos por negocio
# ============================================================================
@calendar_bp.route("/business/<int:business_id>", methods=["GET"])
@user_or_admin_required
def get_events_by_business(business_id):
    try:
        business = db.session.get(Businesses, business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        events = (
            db.session.execute(
                select(Calendar).where(Calendar.business_id == business_id)
            )
            .scalars()
            .all()
        )
        return jsonify([e.to_dict() for e in events]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener evento por cita
# ============================================================================
@calendar_bp.route("/appointment/<int:appointment_id>", methods=["GET"])
@user_or_admin_required
def get_event_by_appointment(appointment_id):
    try:
        appointment = db.session.get(Appointments, appointment_id)
        if not appointment:
            return jsonify({"error": "Cita no encontrada"}), 404

        event = db.session.execute(
            select(Calendar).where(Calendar.appointment_id == appointment_id)
        ).scalar_one_or_none()

        if not event:
            return jsonify({"error": "Evento no encontrado para esta cita"}), 404

        return jsonify(event.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener un evento por ID
# ============================================================================
@calendar_bp.route("/<int:event_id>", methods=["GET"])
@user_or_admin_required
def get_event(event_id):
    try:
        event = db.session.get(Calendar, event_id)
        if not event:
            return jsonify({"error": "Evento no encontrado"}), 404
        return jsonify(event.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PUT - Actualizar evento
# ============================================================================
@calendar_bp.route("/<int:event_id>", methods=["PUT"])
@user_or_admin_required
def update_event(event_id):
    try:
        event = db.session.get(Calendar, event_id)
        if not event:
            return jsonify({"error": "Evento no encontrado"}), 404

        data = request.json
        if not data:
            return jsonify({"error": "El body no puede estar vacío"}), 400

        if "start_date_time" in data or "end_date_time" in data:
            start = data.get("start_date_time", event.start_date_time.isoformat())
            end = data.get("end_date_time", event.end_date_time.isoformat())

            try:
                start_dt = (
                    datetime.fromisoformat(start) if isinstance(start, str) else start
                )
                end_dt = datetime.fromisoformat(end) if isinstance(end, str) else end
            except Exception:
                return (
                    jsonify(
                        {"error": "Formato de fecha inválido. Usa: YYYY-MM-DDTHH:MM:SS"}
                    ),
                    400,
                )

            if start_dt >= end_dt:
                return (
                    jsonify({"error": "La fecha inicio debe ser anterior a la de fin"}),
                    400,
                )

            event.start_date_time = start_dt
            event.end_date_time = end_dt

        if "google_event_id" in data:
            event.google_event_id = data["google_event_id"]
            event.last_sync = datetime.now()

        db.session.commit()
        return jsonify(event.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# DELETE - Eliminar evento
# ============================================================================
@calendar_bp.route("/<int:event_id>", methods=["DELETE"])
@user_or_admin_required
def delete_event(event_id):
    try:
        event = db.session.get(Calendar, event_id)
        if not event:
            return jsonify({"error": "Evento no encontrado"}), 404

        db.session.delete(event)
        db.session.commit()

        return jsonify({"message": "Evento eliminado correctamente"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Filtrar eventos por rango de fechas
# ============================================================================
@calendar_bp.route("/filter/date-range", methods=["GET"])
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

        events = (
            db.session.execute(
                select(Calendar).where(
                    Calendar.start_date_time >= start, Calendar.end_date_time <= end
                )
            )
            .scalars()
            .all()
        )

        return jsonify([e.to_dict() for e in events]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Eventos sincronizados con Google
# ============================================================================
@calendar_bp.route("/synced", methods=["GET"])
@user_or_admin_required
def get_synced_events():
    try:
        events = (
            db.session.execute(
                select(Calendar).where(Calendar.google_event_id.isnot(None))
            )
            .scalars()
            .all()
        )
        return jsonify([e.to_dict() for e in events]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Sincronizar con Google Calendar
# ============================================================================
@calendar_bp.route("/<int:event_id>/sync-google", methods=["POST"])
@user_or_admin_required
def sync_with_google(event_id):
    try:
        event = db.session.get(Calendar, event_id)
        if not event:
            return jsonify({"error": "Evento no encontrado"}), 404

        data = request.json
        if not data or "access_token" not in data:
            return jsonify({"error": "access_token es requerido"}), 400

        access_token = data["access_token"]
        calendar_id = data.get("calendar_id", "primary")

        google_event = {
            "summary": f"Cita - {event.appointment.client.name}",
            "description": f"Servicio: {event.appointment.service.name}\nCliente: {event.appointment.client.name}",
            "start": {
                "dateTime": event.start_date_time.isoformat(),
                "timeZone": "Europe/Madrid",
            },
            "end": {
                "dateTime": event.end_date_time.isoformat(),
                "timeZone": "Europe/Madrid",
            },
        }

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        if event.google_event_id:
            url = f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{event.google_event_id}"
            response = http_requests.put(url, json=google_event, headers=headers)
        else:
            url = (
                f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events"
            )
            response = http_requests.post(url, json=google_event, headers=headers)

        if response.status_code not in [200, 201]:
            return jsonify({"error": f"Error en Google Calendar: {response.text}"}), 400

        result = response.json()
        event.google_event_id = result.get("id")
        event.last_sync = datetime.now()
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Evento sincronizado con Google Calendar",
                    "google_event_id": result.get("id"),
                    "google_event_url": result.get("htmlLink"),
                    "event": event.to_dict(),
                }
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Estadísticas de calendario
# ============================================================================
@calendar_bp.route("/stats", methods=["GET"])
@admin_required
def get_stats():
    try:
        all_events = db.session.execute(select(Calendar)).scalars().all()

        synced = [e for e in all_events if e.google_event_id]

        return (
            jsonify(
                {
                    "total_events": len(all_events),
                    "synced_events": len(synced),
                    "unsynced_events": len(all_events) - len(synced),
                    "sync_percentage": round(
                        len(synced) / len(all_events) * 100 if all_events else 0, 2
                    ),
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
