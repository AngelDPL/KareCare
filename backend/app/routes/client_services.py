from flask import Blueprint, jsonify, request
from sqlalchemy import select
from extensions import db
from app.models import ClientService, Clients, Services
from app.utils.decorators import admin_required, user_or_admin_required
from datetime import datetime

client_services_bp = Blueprint(
    "client_services", __name__, url_prefix="/api/client-services"
)


# ============================================================================
# GET - Obtener todos los servicios de clientes
# ============================================================================
@client_services_bp.route("", methods=["GET"])
@user_or_admin_required
def get_all():
    try:
        client_services = db.session.execute(select(ClientService)).scalars().all()
        return jsonify([cs.to_dict() for cs in client_services]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener servicios de un cliente
# ============================================================================
@client_services_bp.route("/client/<int:client_id>", methods=["GET"])
@user_or_admin_required
def get_by_client(client_id):
    try:
        client = db.session.get(Clients, client_id)
        if not client:
            return jsonify({"error": "Cliente no encontrado"}), 404

        client_services = (
            db.session.execute(
                select(ClientService).where(ClientService.client_id == client_id)
            )
            .scalars()
            .all()
        )
        return jsonify([cs.to_dict() for cs in client_services]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Servicios completados de un cliente
# ============================================================================
@client_services_bp.route("/client/<int:client_id>/completed", methods=["GET"])
@user_or_admin_required
def get_completed_by_client(client_id):
    try:
        client = db.session.get(Clients, client_id)
        if not client:
            return jsonify({"error": "Cliente no encontrado"}), 404

        client_services = (
            db.session.execute(
                select(ClientService).where(
                    ClientService.client_id == client_id,
                    ClientService.completed == True,
                )
            )
            .scalars()
            .all()
        )
        return jsonify([cs.to_dict() for cs in client_services]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Servicios pendientes de un cliente
# ============================================================================
@client_services_bp.route("/client/<int:client_id>/pending", methods=["GET"])
@user_or_admin_required
def get_pending_by_client(client_id):
    try:
        client = db.session.get(Clients, client_id)
        if not client:
            return jsonify({"error": "Cliente no encontrado"}), 404

        client_services = (
            db.session.execute(
                select(ClientService).where(
                    ClientService.client_id == client_id,
                    ClientService.completed == False,
                )
            )
            .scalars()
            .all()
        )
        return jsonify([cs.to_dict() for cs in client_services]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener un client_service por ID
# ============================================================================
@client_services_bp.route("/<int:cs_id>", methods=["GET"])
@user_or_admin_required
def get_one(cs_id):
    try:
        cs = db.session.get(ClientService, cs_id)
        if not cs:
            return jsonify({"error": "Registro no encontrado"}), 404
        return jsonify(cs.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Crear relación cliente-servicio
# ============================================================================
@client_services_bp.route("", methods=["POST"])
@user_or_admin_required
def create():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "El body no puede estar vacío"}), 400

        required_fields = ["client_id", "service_id"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Campos requeridos faltantes: {missing}"}), 400

        client = db.session.get(Clients, data["client_id"])
        if not client or not client.is_active:
            return jsonify({"error": "Cliente no encontrado o inactivo"}), 404

        service = db.session.get(Services, data["service_id"])
        if not service or not service.is_active:
            return jsonify({"error": "Servicio no encontrado o inactivo"}), 404

        existing = db.session.execute(
            select(ClientService).where(
                ClientService.client_id == data["client_id"],
                ClientService.service_id == data["service_id"],
                ClientService.completed == False,
            )
        ).scalar_one_or_none()
        if existing:
            return (
                jsonify({"error": "Este cliente ya tiene este servicio pendiente"}),
                409,
            )

        cs = ClientService(
            client_id=data["client_id"], service_id=data["service_id"], completed=False
        )
        db.session.add(cs)
        db.session.commit()

        return jsonify(cs.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PUT - Marcar como completado
# ============================================================================
@client_services_bp.route("/<int:cs_id>/complete", methods=["PUT"])
@user_or_admin_required
def complete(cs_id):
    try:
        cs = db.session.get(ClientService, cs_id)
        if not cs:
            return jsonify({"error": "Registro no encontrado"}), 404

        data = request.json if request.json else {}

        cs.completed = True
        if "completed_date" in data:
            try:
                cs.completed_date = datetime.fromisoformat(data["completed_date"])
            except Exception:
                return (
                    jsonify({"error": "Formato de fecha inválido. Usa: YYYY-MM-DD"}),
                    400,
                )
        else:
            cs.completed_date = datetime.now()

        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Servicio marcado como completado",
                    "client_service": cs.to_dict(),
                }
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PUT - Marcar como pendiente
# ============================================================================
@client_services_bp.route("/<int:cs_id>/pending", methods=["PUT"])
@user_or_admin_required
def mark_pending(cs_id):
    try:
        cs = db.session.get(ClientService, cs_id)
        if not cs:
            return jsonify({"error": "Registro no encontrado"}), 404

        cs.completed = False
        cs.completed_date = None
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Servicio marcado como pendiente",
                    "client_service": cs.to_dict(),
                }
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# DELETE - Eliminar relación cliente-servicio
# ============================================================================
@client_services_bp.route("/<int:cs_id>", methods=["DELETE"])
@user_or_admin_required
def delete(cs_id):
    try:
        cs = db.session.get(ClientService, cs_id)
        if not cs:
            return jsonify({"error": "Registro no encontrado"}), 404

        db.session.delete(cs)
        db.session.commit()

        return jsonify({"message": "Registro eliminado correctamente"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Estadísticas de un cliente
# ============================================================================
@client_services_bp.route("/client/<int:client_id>/stats", methods=["GET"])
@user_or_admin_required
def get_client_stats(client_id):
    try:
        client = db.session.get(Clients, client_id)
        if not client:
            return jsonify({"error": "Cliente no encontrado"}), 404

        all_cs = (
            db.session.execute(
                select(ClientService).where(ClientService.client_id == client_id)
            )
            .scalars()
            .all()
        )

        completed = [cs for cs in all_cs if cs.completed]

        return (
            jsonify(
                {
                    "client_id": client_id,
                    "client_name": client.name,
                    "total_services": len(all_cs),
                    "completed_services": len(completed),
                    "pending_services": len(all_cs) - len(completed),
                    "completion_rate": round(
                        len(completed) / len(all_cs) * 100 if all_cs else 0, 2
                    ),
                    "services": [cs.to_dict() for cs in all_cs],
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Estadísticas globales
# ============================================================================
@client_services_bp.route("/stats", methods=["GET"])
@admin_required
def get_global_stats():
    try:
        all_cs = db.session.execute(select(ClientService)).scalars().all()

        if not all_cs:
            return (
                jsonify(
                    {
                        "total": 0,
                        "completed": 0,
                        "pending": 0,
                        "completion_rate": 0.0,
                        "unique_clients": 0,
                        "unique_services": 0,
                    }
                ),
                200,
            )

        completed = [cs for cs in all_cs if cs.completed]
        unique_clients = len(set(cs.client_id for cs in all_cs))
        unique_services = len(set(cs.service_id for cs in all_cs))

        return (
            jsonify(
                {
                    "total": len(all_cs),
                    "completed": len(completed),
                    "pending": len(all_cs) - len(completed),
                    "completion_rate": round(len(completed) / len(all_cs) * 100, 2),
                    "unique_clients": unique_clients,
                    "unique_services": unique_services,
                    "average_per_client": (
                        round(len(all_cs) / unique_clients, 2)
                        if unique_clients > 0
                        else 0
                    ),
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
