from flask import Blueprint, jsonify, request
from sqlalchemy import select
from extensions import db
from app.models import Services, Businesses
from app.utils.decorators import admin_required, user_or_admin_required

services_bp = Blueprint("services", __name__, url_prefix="/api/services")


# ============================================================================
# GET - Obtener todos los servicios
# ============================================================================
@services_bp.route("", methods=["GET"])
@user_or_admin_required
def get_all_services():
    try:
        services = (
            db.session.execute(select(Services).where(Services.is_active == True))
            .scalars()
            .all()
        )
        return jsonify([s.to_dict() for s in services]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener servicios por negocio
# ============================================================================
@services_bp.route("/business/<int:business_id>", methods=["GET"])
@user_or_admin_required
def get_services_by_business(business_id):
    try:
        business = db.session.get(Businesses, business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        services = (
            db.session.execute(
                select(Services).where(
                    Services.business_id == business_id, Services.is_active == True
                )
            )
            .scalars()
            .all()
        )
        return jsonify([s.to_dict() for s in services]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener un servicio por ID
# ============================================================================
@services_bp.route("/<int:service_id>", methods=["GET"])
@user_or_admin_required
def get_service(service_id):
    try:
        service = db.session.get(Services, service_id)
        if not service:
            return jsonify({"error": "Servicio no encontrado"}), 404
        return jsonify(service.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Crear servicio
# ============================================================================
@services_bp.route("", methods=["POST"])
@user_or_admin_required
def create_service():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "El body no puede estar vacío"}), 400

        required_fields = ["business_id", "name", "description", "price"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Campos requeridos faltantes: {missing}"}), 400

        business = db.session.get(Businesses, data["business_id"])
        if not business:
            return jsonify({"error": "El negocio no existe"}), 404

        from decimal import Decimal

        try:
            price = Decimal(str(data["price"]))
            if price < 0:
                return jsonify({"error": "El precio no puede ser negativo"}), 400
        except Exception:
            return jsonify({"error": "El precio debe ser un número válido"}), 400

        service = Services(
            business_id=data["business_id"],
            name=data["name"],
            description=data["description"],
            price=price,
        )
        db.session.add(service)
        db.session.commit()

        return jsonify(service.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PUT - Actualizar servicio
# ============================================================================
@services_bp.route("/<int:service_id>", methods=["PUT"])
@user_or_admin_required
def update_service(service_id):
    try:
        service = db.session.get(Services, service_id)
        if not service:
            return jsonify({"error": "Servicio no encontrado"}), 404

        data = request.json
        if not data:
            return jsonify({"error": "El body no puede estar vacío"}), 400

        if "name" in data:
            service.name = data["name"]

        if "description" in data:
            service.description = data["description"]

        if "price" in data:
            from decimal import Decimal

            try:
                price = Decimal(str(data["price"]))
                if price < 0:
                    return jsonify({"error": "El precio no puede ser negativo"}), 400
                service.price = price
            except Exception:
                return jsonify({"error": "El precio debe ser un número válido"}), 400

        if "is_active" in data:
            service.is_active = data["is_active"]

        db.session.commit()
        return jsonify(service.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# DELETE - Soft delete servicio
# ============================================================================
@services_bp.route("/<int:service_id>", methods=["DELETE"])
@user_or_admin_required
def delete_service(service_id):
    try:
        service = db.session.get(Services, service_id)
        if not service:
            return jsonify({"error": "Servicio no encontrado"}), 404

        service.is_active = False
        db.session.commit()

        return jsonify({"message": "Servicio eliminado correctamente"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Buscar servicios por nombre
# ============================================================================
@services_bp.route("/search", methods=["GET"])
@user_or_admin_required
def search_services():
    try:
        name = request.args.get("name")
        if not name:
            return jsonify({"error": "El parámetro 'name' es requerido"}), 400

        services = (
            db.session.execute(
                select(Services).where(
                    Services.name.ilike(f"%{name}%"), Services.is_active == True
                )
            )
            .scalars()
            .all()
        )

        if not services:
            return jsonify({"error": "Ningún servicio encontrado"}), 404

        return jsonify([s.to_dict() for s in services]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Estadísticas de servicios por negocio
# ============================================================================
@services_bp.route("/business/<int:business_id>/stats", methods=["GET"])
@user_or_admin_required
def get_business_services_stats(business_id):
    try:
        business = db.session.get(Businesses, business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        all_services = (
            db.session.execute(
                select(Services).where(Services.business_id == business_id)
            )
            .scalars()
            .all()
        )

        active_services = [s for s in all_services if s.is_active]
        prices = [float(s.price) for s in active_services]

        return (
            jsonify(
                {
                    "business_id": business_id,
                    "business_name": business.business_name,
                    "total_services": len(all_services),
                    "active_services": len(active_services),
                    "inactive_services": len(all_services) - len(active_services),
                    "average_price": (
                        round(sum(prices) / len(prices), 2) if prices else 0
                    ),
                    "min_price": round(min(prices), 2) if prices else 0,
                    "max_price": round(max(prices), 2) if prices else 0,
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
