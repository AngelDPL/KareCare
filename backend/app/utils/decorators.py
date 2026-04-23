from functools import wraps
from flask import jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        from app.models import Admins
        try:
            current_id = int(get_jwt_identity())
            admin = db.session.get(Admins, current_id)
            if not admin or not admin.is_active:
                return jsonify({"error": "Acceso denegado: privilegios de administrador requeridos"}), 403
            g.current_user = admin
            return fn(*args, **kwargs)
        except Exception as e:
            return jsonify({"error": f"Error de autenticación: {str(e)}"}), 401
    return wrapper


def user_or_admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        from app.models import Admins, Users
        try:
            current_id = int(get_jwt_identity())
            admin = db.session.get(Admins, current_id)
            if admin and admin.is_active:
                g.current_user = admin
                return fn(*args, **kwargs)
            user = db.session.get(Users, current_id)
            if user and user.is_active:
                g.current_user = user
                return fn(*args, **kwargs)
            return jsonify({"error": "Acceso denegado: autenticación requerida"}), 403
        except Exception as e:
            return jsonify({"error": f"Error de autenticación: {str(e)}"}), 401
    return wrapper