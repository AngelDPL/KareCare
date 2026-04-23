from flask import Blueprint, jsonify, request
from sqlalchemy import select
from extensions import db
from app.models import Businesses
from app.utils.decorators import admin_required

businesses_bp = Blueprint("businesses", __name__, url_prefix="/api/businesses")


# ============================================================================
# GET - Obtener todos los negocios
# ============================================================================
@businesses_bp.route("", methods=["GET"])
@admin_required
def get_all_businesses():
    try:
        businesses = (
            db.session.execute(select(Businesses).where(Businesses.is_active == True))
            .scalars()
            .all()
        )
        return jsonify([b.to_dict() for b in businesses]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener un negocio por ID
# ============================================================================
@businesses_bp.route("/<int:business_id>", methods=["GET"])
@admin_required
def get_business(business_id):
    try:
        business = db.session.get(Businesses, business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        return jsonify(business.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Crear negocio
# ============================================================================
@businesses_bp.route("", methods=["POST"])
@admin_required
def create_business():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "El body no puede estar vacío"}), 400

        required_fields = ["business_name", "business_RIF", "business_CP"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Campos requeridos faltantes: {missing}"}), 400

        existing = db.session.execute(
            select(Businesses).where(Businesses.business_RIF == data["business_RIF"])
        ).scalar_one_or_none()
        if existing:
            return jsonify({"error": "El RIF ya existe"}), 409

        business = Businesses(
            business_name=data["business_name"],
            business_RIF=data["business_RIF"],
            business_CP=data["business_CP"],
        )
        db.session.add(business)
        db.session.commit()

        return jsonify(business.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PUT - Actualizar negocio
# ============================================================================
@businesses_bp.route("/<int:business_id>", methods=["PUT"])
@admin_required
def update_business(business_id):
    try:
        business = db.session.get(Businesses, business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        data = request.json
        if not data:
            return jsonify({"error": "El body no puede estar vacío"}), 400

        if "business_name" in data:
            business.business_name = data["business_name"]

        if "business_RIF" in data:
            existing = db.session.execute(
                select(Businesses).where(
                    Businesses.business_RIF == data["business_RIF"]
                )
            ).scalar_one_or_none()
            if existing and existing.id != business_id:
                return jsonify({"error": "El RIF ya existe"}), 409
            business.business_RIF = data["business_RIF"]

        if "business_CP" in data:
            business.business_CP = data["business_CP"]

        if "is_active" in data:
            business.is_active = data["is_active"]

        db.session.commit()
        return jsonify(business.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# DELETE - Soft delete negocio
# ============================================================================
@businesses_bp.route("/<int:business_id>", methods=["DELETE"])
@admin_required
def delete_business(business_id):
    try:
        business = db.session.get(Businesses, business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        business.is_active = False
        db.session.commit()

        return jsonify({"message": "Negocio eliminado correctamente"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Estadísticas de un negocio
# ============================================================================
@businesses_bp.route("/<int:business_id>/stats", methods=["GET"])
@admin_required
def get_business_stats(business_id):
    try:
        business = db.session.get(Businesses, business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        return (
            jsonify(
                {
                    "business_id": business.id,
                    "business_name": business.business_name,
                    "total_users": len(business.users),
                    "total_services": len(business.services),
                    "total_clients": len(business.clients),
                    "total_appointments": len(business.appointments),
                    "active_users": sum(1 for u in business.users if u.is_active),
                    "active_services": sum(1 for s in business.services if s.is_active),
                    "active_clients": sum(1 for c in business.clients if c.is_active),
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
