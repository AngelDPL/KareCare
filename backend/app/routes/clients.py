from flask import Blueprint, jsonify, request
from sqlalchemy import select
from extensions import db
from app.models import Clients, Businesses, Notes
from app.utils.decorators import user_or_admin_required

clients_bp = Blueprint("clients", __name__, url_prefix="/api/clients")


# ============================================================================
# GET - Obtener todos los clientes
# ============================================================================
@clients_bp.route("", methods=["GET"])
@user_or_admin_required
def get_all_clients():
    try:
        clients = (
            db.session.execute(select(Clients).where(Clients.is_active == True))
            .scalars()
            .all()
        )
        return jsonify([client.to_dict() for client in clients]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener clientes por negocio
# ============================================================================
@clients_bp.route("/business/<int:business_id>", methods=["GET"])
@user_or_admin_required
def get_clients_by_business(business_id):
    try:
        business = db.session.get(Businesses, business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        clients = (
            db.session.execute(
                select(Clients).where(
                    Clients.business_id == business_id, Clients.is_active == True
                )
            )
            .scalars()
            .all()
        )
        return jsonify([client.to_dict() for client in clients]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener un cliente por ID
# ============================================================================
@clients_bp.route("/<int:client_id>", methods=["GET"])
@user_or_admin_required
def get_client(client_id):
    try:
        client = db.session.get(Clients, client_id)
        if not client:
            return jsonify({"error": "Cliente no encontrado"}), 404
        return jsonify(client.to_dict(full=True)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Crear cliente
# ============================================================================
@clients_bp.route("", methods=["POST"])
@user_or_admin_required
def create_client():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "El body no puede estar vacío"}), 400

        required_fields = ["name", "phone", "client_dni", "email", "business_id"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Campos requeridos faltantes: {missing}"}), 400

        business = db.session.get(Businesses, data["business_id"])
        if not business:
            return jsonify({"error": "El negocio no existe"}), 404

        existing_email = db.session.execute(
            select(Clients).where(Clients.email == data["email"])
        ).scalar_one_or_none()
        if existing_email:
            return jsonify({"error": "El email ya existe"}), 409

        existing_dni = db.session.execute(
            select(Clients).where(Clients.client_dni == data["client_dni"])
        ).scalar_one_or_none()
        if existing_dni:
            return jsonify({"error": "El DNI ya existe"}), 409

        # Generar client_id_number automático
        last_client = db.session.execute(
            select(Clients)
            .where(Clients.business_id == data["business_id"])
            .order_by(Clients.id.desc())
        ).scalar_one_or_none()

        if last_client:
            last_number = int(last_client.client_id_number.split("-")[1])
            new_number = last_number + 1
        else:
            new_number = 1

        client = Clients(
            name=data["name"],
            phone=data["phone"],
            client_id_number=f"CLI-{new_number:03d}",
            client_dni=data["client_dni"],
            email=data["email"],
            business_id=data["business_id"],
            address=data.get("address"),
        )
        db.session.add(client)
        db.session.commit()

        return jsonify(client.to_dict(full=True)), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PUT - Actualizar cliente
# ============================================================================
@clients_bp.route("/<int:client_id>", methods=["PUT"])
@user_or_admin_required
def update_client(client_id):
    try:
        client = db.session.get(Clients, client_id)
        if not client:
            return jsonify({"error": "Cliente no encontrado"}), 404

        data = request.json
        if not data:
            return jsonify({"error": "El body no puede estar vacío"}), 400

        if "name" in data:
            client.name = data["name"]

        if "phone" in data:
            client.phone = data["phone"]

        if "address" in data:
            client.address = data["address"]

        if "email" in data:
            existing = db.session.execute(
                select(Clients).where(Clients.email == data["email"])
            ).scalar_one_or_none()
            if existing and existing.id != client_id:
                return jsonify({"error": "El email ya existe"}), 409
            client.email = data["email"]

        if "is_active" in data:
            client.is_active = data["is_active"]

        db.session.commit()
        return jsonify(client.to_dict(full=True)), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# DELETE - Soft delete cliente
# ============================================================================
@clients_bp.route("/<int:client_id>", methods=["DELETE"])
@user_or_admin_required
def delete_client(client_id):
    try:
        client = db.session.get(Clients, client_id)
        if not client:
            return jsonify({"error": "Cliente no encontrado"}), 404

        client.is_active = False
        db.session.commit()

        return jsonify({"message": "Cliente eliminado correctamente"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Buscar cliente por email
# ============================================================================
@clients_bp.route("/search/email", methods=["GET"])
@user_or_admin_required
def search_by_email():
    try:
        email = request.args.get("email")
        if not email:
            return jsonify({"error": "El parámetro 'email' es requerido"}), 400

        client = db.session.execute(
            select(Clients).where(Clients.email == email, Clients.is_active == True)
        ).scalar_one_or_none()

        if not client:
            return jsonify({"error": "Cliente no encontrado"}), 404

        return jsonify(client.to_dict(full=True)), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Buscar cliente por DNI
# ============================================================================
@clients_bp.route("/search/dni", methods=["GET"])
@user_or_admin_required
def search_by_dni():
    try:
        dni = request.args.get("dni")
        if not dni:
            return jsonify({"error": "El parámetro 'dni' es requerido"}), 400

        client = db.session.execute(
            select(Clients).where(Clients.client_dni == dni, Clients.is_active == True)
        ).scalar_one_or_none()

        if not client:
            return jsonify({"error": "Cliente no encontrado"}), 404

        return jsonify(client.to_dict(full=True)), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Añadir nota a cliente
# ============================================================================
@clients_bp.route("/<int:client_id>/notes", methods=["POST"])
@user_or_admin_required
def add_note(client_id):
    try:
        client = db.session.get(Clients, client_id)
        if not client:
            return jsonify({"error": "Cliente no encontrado"}), 404

        data = request.json
        if not data or "description" not in data:
            return jsonify({"error": "description es requerido"}), 400

        note = Notes(client_id=client_id, description=data["description"])
        db.session.add(note)
        db.session.commit()

        return jsonify(note.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener notas de cliente
# ============================================================================
@clients_bp.route("/<int:client_id>/notes", methods=["GET"])
@user_or_admin_required
def get_notes(client_id):
    try:
        client = db.session.get(Clients, client_id)
        if not client:
            return jsonify({"error": "Cliente no encontrado"}), 404

        notes = (
            db.session.execute(select(Notes).where(Notes.client_id == client_id))
            .scalars()
            .all()
        )

        return jsonify([note.to_dict() for note in notes]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Estadísticas de cliente
# ============================================================================
@clients_bp.route("/<int:client_id>/stats", methods=["GET"])
@user_or_admin_required
def get_client_stats(client_id):
    try:
        client = db.session.get(Clients, client_id)
        if not client:
            return jsonify({"error": "Cliente no encontrado"}), 404

        return (
            jsonify(
                {
                    "client_id": client.id,
                    "client_name": client.name,
                    "email": client.email,
                    "total_appointments": len(client.appointments),
                    "completed_appointments": sum(
                        1 for a in client.appointments if a.status == "completed"
                    ),
                    "pending_appointments": sum(
                        1 for a in client.appointments if a.status == "pending"
                    ),
                    "confirmed_appointments": sum(
                        1 for a in client.appointments if a.status == "confirmed"
                    ),
                    "cancelled_appointments": sum(
                        1 for a in client.appointments if a.status == "cancelled"
                    ),
                    "total_services": len(client.service_instances),
                    "completed_services": sum(
                        1 for s in client.service_instances if s.completed
                    ),
                    "pending_services": sum(
                        1 for s in client.service_instances if not s.completed
                    ),
                    "total_payments": len(client.payments),
                    "total_notes": len(client.notes),
                    "created_at": client.created_at.isoformat(),
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
