from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from sqlalchemy import select
from extensions import db
from app.models import Users, Businesses
from app.utils.decorators import admin_required, user_or_admin_required

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


# ============================================================================
# POST - Login usuario
# ============================================================================
@users_bp.route("/login", methods=["POST"])
def login_user():
    try:
        data = request.json
        if not data or "username" not in data or "password" not in data:
            return jsonify({"error": "username y password son requeridos"}), 400

        user = db.session.execute(
            select(Users).where(Users.username == data["username"])
        ).scalar_one_or_none()

        if not user or not user.check_password(data["password"]):
            return jsonify({"error": "Username o contraseña incorrectos"}), 401

        if not user.is_active:
            return jsonify({"error": "El usuario está inactivo"}), 403

        access_token = create_access_token(identity=str(user.id))

        return (
            jsonify(
                {
                    "message": "Login exitoso",
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
@admin_required
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
            return jsonify({"error": "Negocio no encontrado"}), 404

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
            return jsonify({"error": "Usuario no encontrado"}), 404
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
            return jsonify({"error": "El body no puede estar vacío"}), 400

        required_fields = [
            "username",
            "password",
            "business_id",
            "role",
            "security_question",
            "security_answer",
        ]
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Campos requeridos faltantes: {missing}"}), 400

        existing = db.session.execute(
            select(Users).where(Users.username == data["username"])
        ).scalar_one_or_none()
        if existing:
            return jsonify({"error": "El username ya existe"}), 409

        business = db.session.get(Businesses, data["business_id"])
        if not business:
            return jsonify({"error": "El negocio no existe"}), 404

        valid_roles = ["master", "manager", "employee"]
        if data["role"] not in valid_roles:
            return jsonify({"error": f"Rol inválido. Debe ser: {valid_roles}"}), 400

        if data["role"] == "master":
            existing_master = db.session.execute(
                select(Users).where(
                    Users.business_id == data["business_id"], Users.role == "master"
                )
            ).scalar_one_or_none()
            if existing_master:
                return (
                    jsonify({"error": "Este negocio ya tiene un usuario master"}),
                    409,
                )

        user = Users(
            username=data["username"],
            password=data["password"],
            business_id=data["business_id"],
            role=data["role"],
            security_question=data["security_question"],
            security_answer=data["security_answer"],
        )
        db.session.add(user)
        db.session.commit()

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
            return jsonify({"error": "Usuario no encontrado"}), 404

        data = request.json
        if not data:
            return jsonify({"error": "El body no puede estar vacío"}), 400

        if "username" in data:
            existing = db.session.execute(
                select(Users).where(Users.username == data["username"])
            ).scalar_one_or_none()
            if existing and existing.id != user_id:
                return jsonify({"error": "El username ya existe"}), 409
            user.username = data["username"]

        if "password" in data:
            user.set_password(data["password"])

        if "role" in data:
            valid_roles = ["master", "manager", "employee"]
            if data["role"] not in valid_roles:
                return jsonify({"error": f"Rol inválido. Debe ser: {valid_roles}"}), 400
            if data["role"] == "master" and user.role != "master":
                existing_master = db.session.execute(
                    select(Users).where(
                        Users.business_id == user.business_id, Users.role == "master"
                    )
                ).scalar_one_or_none()
                if existing_master:
                    return (
                        jsonify({"error": "Este negocio ya tiene un usuario master"}),
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
            return jsonify({"error": "Usuario no encontrado"}), 404

        user.is_active = False
        db.session.commit()

        return jsonify({"message": "Usuario eliminado correctamente"}), 200

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
            return jsonify({"error": "Usuario no encontrado"}), 404

        data = request.json
        if not data or "security_answer" not in data:
            return jsonify({"error": "security_answer es requerido"}), 400

        if data["security_answer"].lower() == user.security_answer.lower():
            return (
                jsonify(
                    {
                        "message": "Respuesta correcta",
                        "verified": True,
                        "security_question": user.security_question,
                    }
                ),
                200,
            )

        return jsonify({"message": "Respuesta incorrecta", "verified": False}), 401

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
            return jsonify({"error": "Usuario no encontrado"}), 404

        data = request.json
        if not data or "old_password" not in data or "new_password" not in data:
            return jsonify({"error": "old_password y new_password son requeridos"}), 400

        if not user.check_password(data["old_password"]):
            return jsonify({"error": "La contraseña antigua es incorrecta"}), 401

        user.set_password(data["new_password"])
        db.session.commit()

        return (
            jsonify(
                {"message": "Contraseña cambiada correctamente", "user": user.to_dict()}
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
