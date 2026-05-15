import os
import json
import requests

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

from flask import Blueprint, jsonify, redirect, request
from extensions import db
from app.models import Businesses
from app.utils.decorators import admin_required

google_auth_bp = Blueprint("google_auth", __name__, url_prefix="/api/auth/google")

SCOPES = "https://www.googleapis.com/auth/calendar"
AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
TOKEN_URI = "https://oauth2.googleapis.com/token"


def get_client_id():
    return os.getenv("GOOGLE_CLIENT_ID")


def get_client_secret():
    return os.getenv("GOOGLE_CLIENT_SECRET")


def get_redirect_uri():
    return os.getenv("GOOGLE_REDIRECT_URI")


# ============================================================================
# GET - Iniciar OAuth con Google
# ============================================================================
@google_auth_bp.route("/connect", methods=["GET"])
@admin_required
def connect_google():
    try:
        business_id = request.args.get("business_id", 1)
        auth_url = (
            f"{AUTH_URI}"
            f"?client_id={get_client_id()}"
            f"&redirect_uri={get_redirect_uri()}"
            f"&response_type=code"
            f"&scope={SCOPES}"
            f"&access_type=offline"
            f"&prompt=consent"
            f"&state={business_id}"
        )
        return jsonify({"auth_url": auth_url}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Callback de Google OAuth
# ============================================================================
@google_auth_bp.route("/callback", methods=["GET"])
def google_callback():
    try:
        code = request.args.get("code")
        state = request.args.get("state")
        business_id = int(state)

        print("CODE:", code)
        print("STATE:", state)

        response = requests.post(
            TOKEN_URI,
            data={
                "code": code,
                "client_id": get_client_id(),
                "client_secret": get_client_secret(),
                "redirect_uri": get_redirect_uri(),
                "grant_type": "authorization_code",
            },
        )

        print("TOKEN RESPONSE:", response.status_code, response.text)

        token_data = response.json()

        if "error" in token_data:
            return redirect(
                f"{os.getenv('FRONTEND_URL')}/management?error={token_data['error']}"
            )

        business = db.session.get(Businesses, business_id)
        if not business:
            return redirect(
                f"{os.getenv('FRONTEND_URL')}/management?error=business_not_found"
            )

        business.google_token = json.dumps(token_data)
        db.session.commit()

        print("TOKEN SAVED!")
        return redirect(f"{os.getenv('FRONTEND_URL')}/management?google=connected")

    except Exception as e:
        print("ERROR:", str(e))
        import traceback

        traceback.print_exc()
        return redirect(f"{os.getenv('FRONTEND_URL')}/management?error={str(e)}")


# ============================================================================
# GET - Estado de conexión con Google
# ============================================================================
@google_auth_bp.route("/status/<int:business_id>", methods=["GET"])
@admin_required
def google_status(business_id):
    try:
        business = db.session.get(Businesses, business_id)
        if not business:
            return jsonify({"error": "Business not found"}), 404
        connected = business.google_token is not None
        return jsonify({"connected": connected}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# DELETE - Desconectar Google
# ============================================================================
@google_auth_bp.route("/disconnect/<int:business_id>", methods=["DELETE"])
@admin_required
def disconnect_google(business_id):
    try:
        business = db.session.get(Businesses, business_id)
        if not business:
            return jsonify({"error": "Business not found"}), 404
        business.google_token = None
        db.session.commit()
        return jsonify({"message": "Google Calendar disconnected"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
