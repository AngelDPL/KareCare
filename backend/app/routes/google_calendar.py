import os
import json
import requests
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from extensions import db
from app.models import Appointments, Calendar, Businesses
from app.utils.decorators import user_or_admin_required
from sqlalchemy import select

google_calendar_bp = Blueprint("google_calendar", __name__, url_prefix="/api/calendar/google")

def get_valid_token(business_id: int) -> str | None:
    business = db.session.get(Businesses, business_id)
    if not business or not business.google_token:
        return None

    token_data = json.loads(business.google_token)
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")

    test = requests.get(
        "https://www.googleapis.com/calendar/v3/calendars/primary",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    if test.status_code == 401:
        refreshed = requests.post("https://oauth2.googleapis.com/token", data={
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        })
        if refreshed.status_code == 200:
            new_data = refreshed.json()
            token_data["access_token"] = new_data["access_token"]
            business.google_token = json.dumps(token_data)
            db.session.commit()
            return new_data["access_token"]
        return None

    return access_token


def sync_appointment_to_google(appointment: Appointments) -> str | None:
    token = get_valid_token(appointment.business_id)
    if not token:
        return None

    start = appointment.date_time
    end = start + timedelta(hours=1)

    event = {
        "summary": f"{appointment.client.name} — {appointment.service.name}",
        "description": f"Employee: {appointment.user.username}\nService: {appointment.service.name}\nClient: {appointment.client.name}",
        "start": {"dateTime": start.isoformat(), "timeZone": "Europe/Madrid"},
        "end": {"dateTime": end.isoformat(), "timeZone": "Europe/Madrid"},
    }

    response = requests.post(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json=event
    )

    if response.status_code == 200:
        return response.json().get("id")
    return None


def delete_google_event(business_id: int, google_event_id: str) -> bool:
    token = get_valid_token(business_id)
    if not token:
        return False

    response = requests.delete(
        f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{google_event_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response.status_code == 204


# ============================================================================
# GET - Obtener eventos de Google Calendar
# ============================================================================
@google_calendar_bp.route("/<int:business_id>", methods=["GET"])
@user_or_admin_required
def get_google_events(business_id):
    try:
        token = get_valid_token(business_id)
        if not token:
            return jsonify({"error": "Google Calendar not connected"}), 400

        time_min = request.args.get("time_min", datetime.utcnow().isoformat() + "Z")
        time_max = request.args.get("time_max")

        params = {
            "timeMin": time_min,
            "singleEvents": True,
            "orderBy": "startTime",
            "maxResults": 100
        }
        if time_max:
            params["timeMax"] = time_max

        response = requests.get(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            headers={"Authorization": f"Bearer {token}"},
            params=params
        )

        return jsonify(response.json()), response.status_code

    except Exception as e:
        return jsonify({"error": str(e)}), 500