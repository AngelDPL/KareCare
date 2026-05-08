from flask import Blueprint, jsonify, request
from sqlalchemy import select
from extensions import db
from app.models import Payments, Clients, Businesses, PaymentHistory
from app.utils.decorators import admin_required, user_or_admin_required
from decimal import Decimal
from datetime import datetime

payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")


# ============================================================================
# GET - Obtener todos los pagos
# ============================================================================
@payments_bp.route("", methods=["GET"])
@user_or_admin_required
def get_all_payments():
    try:
        payments = db.session.execute(select(Payments)).scalars().all()
        return jsonify([p.to_dict() for p in payments]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener pagos por cliente
# ============================================================================
@payments_bp.route("/client/<int:client_id>", methods=["GET"])
@user_or_admin_required
def get_payments_by_client(client_id):
    try:
        client = db.session.get(Clients, client_id)
        if not client:
            return jsonify({"error": "Cliente no encontrado"}), 404

        payments = (
            db.session.execute(select(Payments).where(Payments.client_id == client_id))
            .scalars()
            .all()
        )
        return jsonify([p.to_dict() for p in payments]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener un pago por ID
# ============================================================================
@payments_bp.route("/<int:payment_id>", methods=["GET"])
@user_or_admin_required
def get_payment(payment_id):
    try:
        payment = db.session.get(Payments, payment_id)
        if not payment:
            return jsonify({"error": "Pago no encontrado"}), 404
        return jsonify(payment.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Crear pago
# ============================================================================
@payments_bp.route("", methods=["POST"])
@user_or_admin_required
def create_payment():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "El body no puede estar vacío"}), 400

        required_fields = ["client_id", "payment_method", "estimated_total"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Campos requeridos faltantes: {missing}"}), 400

        client = db.session.get(Clients, data["client_id"])
        if not client or not client.is_active:
            return jsonify({"error": "Cliente no encontrado o inactivo"}), 404

        valid_methods = ["cash", "card"]
        if data["payment_method"] not in valid_methods:
            return (
                jsonify({"error": f"Método inválido. Debe ser: {valid_methods}"}),
                400,
            )

        try:
            estimated_total = Decimal(str(data["estimated_total"]))
            if estimated_total <= 0:
                return jsonify({"error": "El total estimado debe ser mayor a 0"}), 400
        except Exception:
            return (
                jsonify({"error": "El total estimado debe ser un número válido"}),
                400,
            )

        payments_made = Decimal(str(data.get("payments_made", 0)))
        if payments_made < 0:
            return (
                jsonify({"error": "Los pagos realizados no pueden ser negativos"}),
                400,
            )
        if payments_made > estimated_total:
            return (
                jsonify({"error": "Los pagos no pueden exceder el total estimado"}),
                400,
            )

        payment_date = None
        if "payment_date" in data:
            try:
                payment_date = datetime.fromisoformat(data["payment_date"]).date()
            except Exception:
                return (
                    jsonify({"error": "Formato de fecha inválido. Usa: YYYY-MM-DD"}),
                    400,
                )

        status = "paid" if payments_made == estimated_total else "pending"

        payment = Payments(
            client_id=data["client_id"],
            payment_method=data["payment_method"],
            estimated_total=estimated_total,
            payments_made=payments_made,
            payment_date=payment_date,
            status=status,
        )
        db.session.add(payment)
        db.session.commit()
        
        if payments_made > 0:
            history = PaymentHistory(
                payment_id=payment.id,
                amount=payments_made,
                payment_method=data["payment_method"],
                payment_date=payment_date or datetime.now()
            )
            db.session.add(history)
            db.session.commit()

        return jsonify(payment.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PUT - Actualizar pago
# ============================================================================
@payments_bp.route("/<int:payment_id>", methods=["PUT"])
@user_or_admin_required
def update_payment(payment_id):
    try:
        payment = db.session.get(Payments, payment_id)
        if not payment:
            return jsonify({"error": "Pago no encontrado"}), 404

        data = request.json
        if not data:
            return jsonify({"error": "El body no puede estar vacío"}), 400

        if "payment_method" in data:
            valid_methods = ["cash", "card"]
            if data["payment_method"] not in valid_methods:
                return (
                    jsonify({"error": f"Método inválido. Debe ser: {valid_methods}"}),
                    400,
                )
            payment.payment_method = data["payment_method"]

        if "estimated_total" in data:
            try:
                estimated_total = Decimal(str(data["estimated_total"]))
                if estimated_total <= 0:
                    return jsonify({"error": "El total debe ser mayor a 0"}), 400
                if payment.payments_made > estimated_total:
                    return (
                        jsonify(
                            {
                                "error": "El total no puede ser menor que los pagos realizados"
                            }
                        ),
                        400,
                    )
                payment.estimated_total = estimated_total
            except Exception:
                return jsonify({"error": "El total debe ser un número válido"}), 400

        if "payments_made" in data:
            try:
                payments_made = Decimal(str(data["payments_made"]))
                if payments_made < 0:
                    return jsonify({"error": "Los pagos no pueden ser negativos"}), 400
                if payments_made > payment.estimated_total:
                    return (
                        jsonify({"error": "Los pagos no pueden exceder el total"}),
                        400,
                    )
                payment.payments_made = payments_made
            except Exception:
                return jsonify({"error": "Los pagos deben ser un número válido"}), 400

        if "payment_date" in data:
            if data["payment_date"] is None:
                payment.payment_date = None
            else:
                try:
                    payment.payment_date = datetime.fromisoformat(
                        data["payment_date"]
                    ).date()
                except Exception:
                    return (
                        jsonify(
                            {"error": "Formato de fecha inválido. Usa: YYYY-MM-DD"}
                        ),
                        400,
                    )

        payment.status = (
            "paid" if payment.payments_made == payment.estimated_total else "pending"
        )

        db.session.commit()
        return jsonify(payment.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# DELETE - Eliminar pago
# ============================================================================
@payments_bp.route("/<int:payment_id>", methods=["DELETE"])
@admin_required
def delete_payment(payment_id):
    try:
        payment = db.session.get(Payments, payment_id)
        if not payment:
            return jsonify({"error": "Pago no encontrado"}), 404

        db.session.delete(payment)
        db.session.commit()

        return jsonify({"message": "Pago eliminado correctamente"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# DELETE - Eliminar abono del historial
# ============================================================================
@payments_bp.route('/abono/<int:history_id>', methods=['DELETE'])
@user_or_admin_required
def delete_payment_history(history_id):
    try:
        history = db.session.get(PaymentHistory, history_id)
        if not history:
            return jsonify({"error": "Abono no encontrado"}), 404

        payment = db.session.get(Payments, history.payment_id)
        if not payment:
            return jsonify({"error": "Pago no encontrado"}), 404

        payment.payments_made = payment.payments_made - history.amount
        payment.status = (
            "paid" if payment.payments_made == payment.estimated_total else "pending"
        )

        db.session.delete(history)
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Abono eliminado correctamente",
                    "payment": payment.to_dict(),
                }
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Registrar abono
# ============================================================================
@payments_bp.route("/<int:payment_id>/add-payment", methods=["POST"])
@user_or_admin_required
def add_payment(payment_id):
    try:
        payment = db.session.get(Payments, payment_id)
        if not payment:
            return jsonify({"error": "Pago no encontrado"}), 404

        data = request.json
        if not data or "amount" not in data:
            return jsonify({"error": "El 'amount' es requerido"}), 400

        if "payment_method" not in data:
            return jsonify({"error": "El 'payment_method' es requerido"}), 400

        valid_methods = ["cash", "card"]
        if data["payment_method"] not in valid_methods:
            return (
                jsonify({"error": f"Método inválido. Debe ser: {valid_methods}"}),
                400,
            )

        try:
            amount = Decimal(str(data["amount"]))
            if amount <= 0:
                return jsonify({"error": "El monto debe ser mayor a 0"}), 400
        except Exception:
            return jsonify({"error": "El monto debe ser un número válido"}), 400

        new_total = payment.payments_made + amount
        if new_total > payment.estimated_total:
            return (
                jsonify(
                    {
                        "error": f"Monto excede el total. Máximo permitido: {payment.estimated_total - payment.payments_made}"
                    }
                ),
                400,
            )

        payment.payments_made = new_total
        payment.payment_method = data["payment_method"]
        payment.status = (
            "paid" if payment.payments_made == payment.estimated_total else "pending"
        )

        payment_date = None
        if "payment_date" in data:
            try:
                payment_date = datetime.fromisoformat(data["payment_date"])
            except Exception:
                return (
                    jsonify({"error": "Formato de fecha inválido. Usa: YYYY-MM-DD"}),
                    400,
                )
        else:
            payment_date = datetime.now()

        history = PaymentHistory(
            payment_id=payment.id,
            amount=amount,
            payment_method=data["payment_method"],
            payment_date=payment_date,
        )
        db.session.add(history)
        db.session.commit()

        return (
            jsonify(
                {
                    "message": f"Abono de {amount} registrado correctamente",
                    "payment": payment.to_dict(),
                }
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Estadísticas de pagos
# ============================================================================
@payments_bp.route("/stats", methods=["GET"])
@admin_required
def get_stats():
    try:
        payments = db.session.execute(select(Payments)).scalars().all()

        if not payments:
            return (
                jsonify(
                    {
                        "total_payments": 0,
                        "pending": 0,
                        "paid": 0,
                        "total_estimated": "0.00",
                        "total_collected": "0.00",
                        "total_pending": "0.00",
                        "collection_rate": 0.0,
                    }
                ),
                200,
            )

        total_estimated = sum(p.estimated_total for p in payments)
        total_collected = sum(p.payments_made for p in payments)

        return (
            jsonify(
                {
                    "total_payments": len(payments),
                    "pending": sum(1 for p in payments if p.status == "pending"),
                    "paid": sum(1 for p in payments if p.status == "paid"),
                    "total_estimated": str(total_estimated),
                    "total_collected": str(total_collected),
                    "total_pending": str(total_estimated - total_collected),
                    "collection_rate": round(
                        (
                            float(total_collected) / float(total_estimated) * 100
                            if total_estimated > 0
                            else 0
                        ),
                        2,
                    ),
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
