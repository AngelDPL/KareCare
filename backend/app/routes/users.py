from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from sqlalchemy import select
from extensions import db
from app.models import Users, Businesses
from app.utils.decorators import admin_required, user_or_admin_required
import resend
import os
import secrets
import string
from datetime import datetime

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


# ============================================================================
# POST - Login usuario
# ============================================================================
@users_bp.route("/login", methods=["POST"])
def login_user():
    try:
        data = request.json
        if not data or "username" not in data or "password" not in data:
            return jsonify({"error": "username and password are required"}), 400

        user = db.session.execute(
            select(Users).where(Users.username == data["username"])
        ).scalar_one_or_none()

        if not user or not user.check_password(data["password"]):
            return jsonify({"error": "Incorrect username or password"}), 401

        if not user.is_active:
            return jsonify({"error": "The user is inactive"}), 403

        access_token = create_access_token(identity=str(user.id))

        return (
            jsonify(
                {
                    "message": "Successful login",
                    "access_token": access_token,
                    "user": user.to_dict(),
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener todos los usuarios
# ============================================================================
@users_bp.route("", methods=["GET"])
@user_or_admin_required
def get_all_users():
    try:
        users = (
            db.session.execute(select(Users).where(Users.is_active == True))
            .scalars()
            .all()
        )
        return jsonify([user.to_dict() for user in users]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener usuarios por negocio
# ============================================================================
@users_bp.route("/business/<int:business_id>", methods=["GET"])
@admin_required
def get_users_by_business(business_id):
    try:
        business = db.session.get(Businesses, business_id)
        if not business:
            return jsonify({"error": "Business not found"}), 404

        users = (
            db.session.execute(
                select(Users).where(
                    Users.business_id == business_id, Users.is_active == True
                )
            )
            .scalars()
            .all()
        )
        return jsonify([user.to_dict() for user in users]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener un usuario por ID
# ============================================================================
@users_bp.route("/<int:user_id>", methods=["GET"])
@user_or_admin_required
def get_user(user_id):
    try:
        user = db.session.get(Users, user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(user.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Crear usuario
# ============================================================================
@users_bp.route("", methods=["POST"])
@admin_required
def create_user():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "The body cannot be empty"}), 400

        required_fields = ["username", "email", "business_id", "role"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Missing required fields: {missing}"}), 400

        existing = db.session.execute(
            select(Users).where(Users.username == data["username"])
        ).scalar_one_or_none()
        if existing:
            return jsonify({"error": "The username already exists"}), 409

        existing_email = db.session.execute(
            select(Users).where(Users.email == data["email"])
        ).scalar_one_or_none()
        if existing_email:
            return jsonify({"error": "The email already exists"}), 409

        business = db.session.get(Businesses, data["business_id"])
        if not business:
            return jsonify({"error": "The business does not exist"}), 404

        valid_roles = ["master", "manager", "employee"]
        if data["role"] not in valid_roles:
            return jsonify({"error": f"Invalid role. It should be: {valid_roles}"}), 400

        if data["role"] == "master":
            existing_master = db.session.execute(
                select(Users).where(
                    Users.business_id == data["business_id"], Users.role == "master"
                )
            ).scalar_one_or_none()
            if existing_master:
                return (
                    jsonify({"error": "This business already has a master user"}),
                    409,
                )

        temp_password = "".join(
            secrets.choice(string.ascii_letters + string.digits) for _ in range(10)
        )

        user = Users(
            username=data["username"],
            password=temp_password,
            business_id=data["business_id"],
            email=data["email"],
            role=data["role"],
        )
        db.session.add(user)
        db.session.commit()

        resend.api_key = os.getenv("RESEND_API_KEY")
        resend.Emails.send(
            {
                "from": "KareCare <onboarding@resend.dev>",
                "to": os.getenv("TEST_EMAIL", data["email"]),
                "subject": "Welcome to KareCare — Your credentials",
                "html": f"""<!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
                <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
                    <tr><td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
                            <tr>
                                <td style="background-color:#1e1b4b;border-radius:12px 12px 0 0;padding:32px 40px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td><p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">KareCare</p>
                                            <p style="margin:4px 0 0;font-size:13px;color:#c7d2fe;">Dental Clinic</p></td>
                                            <td align="right"><p style="margin:0;font-size:13px;color:#c7d2fe;">Welcome</p></td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="background-color:#ffffff;padding:40px;">
                                    <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Hello, {data["username"]}</p>
                                    <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">
                                        Your account has been created in KareCare. Here are your credentials to access the platform.
                                    </p>
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
                                        <tr style="background-color:#1e1b4b;">
                                            <td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:600;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">Your credentials</td>
                                        </tr>
                                        <tr style="background-color:#f8fafc;">
                                            <td style="padding:12px 16px;font-size:14px;color:#6b7280;width:40%;">Username</td>
                                            <td style="padding:12px 16px;font-size:14px;color:#111827;font-weight:600;">{data["username"]}</td>
                                        </tr>
                                        <tr style="background-color:#ffffff;">
                                            <td style="padding:12px 16px;font-size:14px;color:#6b7280;">Temporary password</td>
                                            <td style="padding:12px 16px;font-size:14px;color:#111827;font-weight:600;font-family:monospace;">{temp_password}</td>
                                        </tr>
                                        <tr style="background-color:#f8fafc;">
                                            <td style="padding:12px 16px;font-size:14px;color:#6b7280;">Role</td>
                                            <td style="padding:12px 16px;font-size:14px;color:#111827;font-weight:600;">{data["role"].capitalize()}</td>
                                        </tr>
                                    </table>
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                                        <tr>
                                            <td style="background-color:#eef2ff;border-left:4px solid #1e1b4b;border-radius:0 8px 8px 0;padding:16px 20px;">
                                                <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#1e1b4b;text-transform:uppercase;letter-spacing:0.5px;">Important</p>
                                                <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">This is a temporary password. Please change it after your first login for security reasons.</p>
                                            </td>
                                        </tr>
                                    </table>
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                                        <tr>
                                            <td align="center">
                                                <a href="http://localhost:5173/login?new_user=true"
                                                style="background-color:#1e1b4b;color:#ffffff;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">
                                                    Go to login
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="background-color:#1e1b4b;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
                                    <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">KareCare · Dental Clinic</p>
                                    <p style="margin:8px 0 0;font-size:12px;color:#a5b4fc;">Please keep your credentials safe and do not share them.</p>
                                </td>
                            </tr>
                        </table>
                    </td></tr>
                </table>
                </body>
                </html>""",
            }
        )

        return jsonify(user.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PUT - Actualizar usuario
# ============================================================================
@users_bp.route("/<int:user_id>", methods=["PUT"])
@user_or_admin_required
def update_user(user_id):
    try:
        user = db.session.get(Users, user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.json
        if not data:
            return jsonify({"error": "The body cannot be empty"}), 400

        if "username" in data:
            existing = db.session.execute(
                select(Users).where(Users.username == data["username"])
            ).scalar_one_or_none()
            if existing and existing.id != user_id:
                return jsonify({"error": "The username already exists"}), 409
            user.username = data["username"]

        if "password" in data:
            user.set_password(data["password"])

        if "role" in data:
            valid_roles = ["master", "manager", "employee"]
            if data["role"] not in valid_roles:
                return (
                    jsonify({"error": f"Invalid role. It should be: {valid_roles}"}),
                    400,
                )
            if data["role"] == "master" and user.role != "master":
                existing_master = db.session.execute(
                    select(Users).where(
                        Users.business_id == user.business_id, Users.role == "master"
                    )
                ).scalar_one_or_none()
                if existing_master:
                    return (
                        jsonify({"error": "This business already has a master user"}),
                        409,
                    )
            user.role = data["role"]

        if "security_question" in data:
            user.security_question = data["security_question"]

        if "security_answer" in data:
            user.security_answer = data["security_answer"]

        if "is_active" in data:
            user.is_active = data["is_active"]

        db.session.commit()
        return jsonify(user.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# DELETE - Soft delete usuario
# ============================================================================
@users_bp.route("/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    try:
        user = db.session.get(Users, user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        user.is_active = False
        db.session.commit()

        return jsonify({"message": "Successfully deleted user"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Verificar respuesta de seguridad
# ============================================================================
@users_bp.route("/verify-security/<int:user_id>", methods=["POST"])
def verify_security_answer(user_id):
    try:
        user = db.session.get(Users, user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.json
        if not data or "security_answer" not in data:
            return jsonify({"error": "security_answer is required"}), 400

        if data["security_answer"].lower() == user.security_answer.lower():
            return (
                jsonify(
                    {
                        "message": "Correct answer",
                        "verified": True,
                        "security_question": user.security_question,
                    }
                ),
                200,
            )

        return jsonify({"message": "Wrong answer", "verified": False}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PUT - Cambiar contraseña
# ============================================================================
@users_bp.route("/<int:user_id>/change-password", methods=["PUT"])
@user_or_admin_required
def change_password(user_id):
    try:
        user = db.session.get(Users, user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        data = request.json
        if not data or "old_password" not in data or "new_password" not in data:
            return jsonify({"error": "old_password and new_password are required"}), 400

        if not user.check_password(data["old_password"]):
            return jsonify({"error": "The old password is incorrect."}), 401

        user.set_password(data["new_password"])
        user.first_login = False
        db.session.commit()

        return (
            jsonify(
                {"message": "Password changed successfully", "user": user.to_dict()}
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Reset password
# ============================================================================
@users_bp.route("/<int:user_id>/reset-password", methods=["POST"])
@admin_required
def reset_password(user_id):
    try:
        user = db.session.get(Users, user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        temp_password = "".join(
            secrets.choice(string.ascii_letters + string.digits) for _ in range(10)
        )
        user.set_password(temp_password)
        db.session.commit()

        resend.api_key = os.getenv("RESEND_API_KEY")
        resend.Emails.send(
            {
                "from": "KareCare <onboarding@resend.dev>",
                "to": os.getenv("TEST_EMAIL", user.email),
                "subject": "KareCare — Password reset",
                "html": f"""<!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"></head>
                <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
                    <tr><td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
                            <tr>
                                <td style="background-color:#1e1b4b;border-radius:12px 12px 0 0;padding:32px 40px;">
                                    <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">KareCare</p>
                                    <p style="margin:4px 0 0;font-size:13px;color:#c7d2fe;">Dental Clinic</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="background-color:#ffffff;padding:40px;">
                                    <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Hello, {user.username}</p>
                                    <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">Your password has been reset. Here is your new temporary password:</p>
                                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
                                        <tr style="background-color:#1e1b4b;">
                                            <td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:600;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">New credentials</td>
                                        </tr>
                                        <tr style="background-color:#f8fafc;">
                                            <td style="padding:12px 16px;font-size:14px;color:#6b7280;width:40%;">Username</td>
                                            <td style="padding:12px 16px;font-size:14px;color:#111827;font-weight:600;">{user.username}</td>
                                        </tr>
                                        <tr style="background-color:#ffffff;">
                                            <td style="padding:12px 16px;font-size:14px;color:#6b7280;">New password</td>
                                            <td style="padding:12px 16px;font-size:14px;color:#111827;font-weight:600;font-family:monospace;">{temp_password}</td>
                                        </tr>
                                    </table>
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="background-color:#eef2ff;border-left:4px solid #1e1b4b;border-radius:0 8px 8px 0;padding:16px 20px;">
                                                <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">Please change this password after your next login.</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="background-color:#1e1b4b;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
                                    <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">KareCare · Dental Clinic</p>
                                    <p style="margin:8px 0 0;font-size:12px;color:#a5b4fc;">Keep your credentials safe.</p>
                                </td>
                            </tr>
                        </table>
                    </td></tr>
                </table>
                </body>
                </html>""",
            }
        )

        return (
            jsonify({"message": f"Password reset successfully for {user.username}"}),
            200,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
