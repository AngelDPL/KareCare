from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from sqlalchemy import select
from extensions import db
from app.models import Admins
from app.utils.decorators import admin_required

admins_bp = Blueprint('admins', __name__, url_prefix='/api/admins')


# ============================================================================
# POST - Setup primer administrador (sin autenticación)
# ============================================================================
@admins_bp.route('/setup', methods=['POST'])
def setup_first_admin():
    try:
        count = db.session.execute(select(Admins)).scalars().all()
        if len(count) > 0:
            return jsonify({"error": "Ya existe un administrador configurado"}), 409

        data = request.json
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({"error": "username y password son requeridos"}), 400

        admin = Admins(username=data['username'], password=data['password'])
        db.session.add(admin)
        db.session.commit()

        return jsonify({
            "message": "Administrador creado exitosamente",
            "admin": admin.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Login admin
# ============================================================================
@admins_bp.route('/login', methods=['POST'])
def login_admin():
    try:
        data = request.json
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({"error": "username y password son requeridos"}), 400

        admin = db.session.execute(
            select(Admins).where(Admins.username == data['username'])
        ).scalar_one_or_none()

        if not admin or not admin.check_password(data['password']):
            return jsonify({"error": "Username o contraseña incorrectos"}), 401

        if not admin.is_active:
            return jsonify({"error": "El administrador está inactivo"}), 403

        access_token = create_access_token(identity=str(admin.id))

        return jsonify({
            "message": "Login exitoso",
            "access_token": access_token,
            "admin": admin.to_dict()
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener todos los admins
# ============================================================================
@admins_bp.route('', methods=['GET'])
@admin_required
def get_all_admins():
    try:
        admins = db.session.execute(
            select(Admins).where(Admins.is_active == True)
        ).scalars().all()
        return jsonify([admin.to_dict() for admin in admins]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener un admin por ID
# ============================================================================
@admins_bp.route('/<int:admin_id>', methods=['GET'])
@admin_required
def get_admin(admin_id):
    try:
        admin = db.session.get(Admins, admin_id)
        if not admin:
            return jsonify({"error": "Administrador no encontrado"}), 404
        return jsonify(admin.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Crear nuevo admin
# ============================================================================
@admins_bp.route('', methods=['POST'])
@admin_required
def create_admin():
    try:
        data = request.json
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({"error": "username y password son requeridos"}), 400

        existing = db.session.execute(
            select(Admins).where(Admins.username == data['username'])
        ).scalar_one_or_none()
        if existing:
            return jsonify({"error": "El username ya existe"}), 409

        admin = Admins(username=data['username'], password=data['password'])
        db.session.add(admin)
        db.session.commit()

        return jsonify(admin.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PUT - Actualizar admin
# ============================================================================
@admins_bp.route('/<int:admin_id>', methods=['PUT'])
@admin_required
def update_admin(admin_id):
    try:
        admin = db.session.get(Admins, admin_id)
        if not admin:
            return jsonify({"error": "Administrador no encontrado"}), 404

        data = request.json
        if not data:
            return jsonify({"error": "El body no puede estar vacío"}), 400

        if 'username' in data:
            existing = db.session.execute(
                select(Admins).where(Admins.username == data['username'])
            ).scalar_one_or_none()
            if existing and existing.id != admin_id:
                return jsonify({"error": "El username ya existe"}), 409
            admin.username = data['username']

        if 'password' in data:
            admin.set_password(data['password'])

        if 'is_active' in data:
            admin.is_active = data['is_active']

        db.session.commit()
        return jsonify(admin.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# DELETE - Soft delete admin
# ============================================================================
@admins_bp.route('/<int:admin_id>', methods=['DELETE'])
@admin_required
def delete_admin(admin_id):
    try:
        admin = db.session.get(Admins, admin_id)
        if not admin:
            return jsonify({"error": "Administrador no encontrado"}), 404

        admin.is_active = False
        db.session.commit()

        return jsonify({"message": "Administrador eliminado correctamente"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500