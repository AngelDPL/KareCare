from flask import Blueprint, jsonify, request
from sqlalchemy import select
from extensions import db
from app.models import Budget, BudgetItem, Clients, Businesses, Services
from app.utils.decorators import admin_required, user_or_admin_required
from decimal import Decimal
from datetime import datetime
import resend
import os
import io
import base64
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

budgets_bp = Blueprint("budgets", __name__, url_prefix="/api/budgets")


# ============================================================================
# GET - Obtener todos los presupuestos
# ============================================================================
@budgets_bp.route("", methods=["GET"])
@user_or_admin_required
def get_all_budgets():
    try:
        budgets = db.session.execute(select(Budget)).scalars().all()
        return jsonify([b.to_dict() for b in budgets]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener presupuestos por cliente
# ============================================================================
@budgets_bp.route("/client/<int:client_id>", methods=["GET"])
@user_or_admin_required
def get_budgets_by_client(client_id):
    try:
        client = db.session.get(Clients, client_id)
        if not client:
            return jsonify({"error": "Cliente no encontrado"}), 404

        budgets = (
            db.session.execute(select(Budget).where(Budget.client_id == client_id))
            .scalars()
            .all()
        )
        return jsonify([b.to_dict() for b in budgets]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# GET - Obtener un presupuesto por ID
# ============================================================================
@budgets_bp.route("/<int:budget_id>", methods=["GET"])
@user_or_admin_required
def get_budget(budget_id):
    try:
        budget = db.session.get(Budget, budget_id)
        if not budget:
            return jsonify({"error": "Presupuesto no encontrado"}), 404
        return jsonify(budget.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Crear presupuesto
# ============================================================================
@budgets_bp.route("", methods=["POST"])
@user_or_admin_required
def create_budget():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "El body no puede estar vacío"}), 400

        required_fields = ["client_id", "business_id", "items"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Campos requeridos faltantes: {missing}"}), 400

        client = db.session.get(Clients, data["client_id"])
        if not client or not client.is_active:
            return jsonify({"error": "Cliente no encontrado o inactivo"}), 404

        business = db.session.get(Businesses, data["business_id"])
        if not business or not business.is_active:
            return jsonify({"error": "Negocio no encontrado o inactivo"}), 404

        if not data["items"] or len(data["items"]) == 0:
            return jsonify({"error": "El presupuesto debe tener al menos un item"}), 400

        valid_until = None
        if "valid_until" in data:
            try:
                valid_until = datetime.fromisoformat(data["valid_until"])
            except Exception:
                return (
                    jsonify({"error": "Formato de fecha inválido. Usa: YYYY-MM-DD"}),
                    400,
                )

        budget = Budget(
            client_id=data["client_id"],
            business_id=data["business_id"],
            notes=data.get("notes"),
            valid_until=valid_until,
            status="draft",
        )
        db.session.add(budget)
        db.session.flush()

        total = Decimal("0")
        for item_data in data["items"]:
            if "description" not in item_data or "unit_price" not in item_data:
                return (
                    jsonify({"error": "Cada item necesita description y unit_price"}),
                    400,
                )

            quantity = int(item_data.get("quantity", 1))
            unit_price = Decimal(str(item_data["unit_price"]))
            subtotal = unit_price * quantity
            total += subtotal

            item = BudgetItem(
                budget_id=budget.id,
                service_id=item_data.get("service_id"),
                description=item_data["description"],
                quantity=quantity,
                unit_price=unit_price,
                subtotal=subtotal,
            )
            db.session.add(item)

        budget.total = total
        db.session.commit()

        return jsonify(budget.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# PUT - Actualizar estado del presupuesto
# ============================================================================
@budgets_bp.route("/<int:budget_id>/status", methods=["PUT"])
@user_or_admin_required
def update_budget_status(budget_id):
    try:
        budget = db.session.get(Budget, budget_id)
        if not budget:
            return jsonify({"error": "Presupuesto no encontrado"}), 404

        data = request.json
        if not data or "status" not in data:
            return jsonify({"error": "status es requerido"}), 400

        valid_statuses = ["draft", "sent", "accepted", "rejected"]
        if data["status"] not in valid_statuses:
            return (
                jsonify({"error": f"Estado inválido. Debe ser: {valid_statuses}"}),
                400,
            )

        budget.status = data["status"]
        db.session.commit()

        return jsonify(budget.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# DELETE - Eliminar presupuesto
# ============================================================================
@budgets_bp.route("/<int:budget_id>", methods=["DELETE"])
@user_or_admin_required
def delete_budget(budget_id):
    try:
        budget = db.session.get(Budget, budget_id)
        if not budget:
            return jsonify({"error": "Presupuesto no encontrado"}), 404

        db.session.delete(budget)
        db.session.commit()

        return jsonify({"message": "Presupuesto eliminado correctamente"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================================
# POST - Enviar presupuesto por email
# ============================================================================
@budgets_bp.route("/<int:budget_id>/send", methods=["POST"])
@user_or_admin_required
def send_budget(budget_id):
    try:
        budget = db.session.get(Budget, budget_id)
        if not budget:
            return jsonify({"error": "Presupuesto no encontrado"}), 404
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40,
        )
        styles = getSampleStyleSheet()
        elements = []

        indigo = colors.HexColor("#4f46e5")
        indigo_light = colors.HexColor("#eef2ff")
        gray = colors.HexColor("#6b7280")
        gray_light = colors.HexColor("#f9fafb")
        dark = colors.HexColor("#111827")
        white = colors.white

        header_data = [
            [
                Paragraph(
                    '<font size="20"><b>KareCare</b></font><br/><font size="9" color="#6b7280">Clínica Dental</font>',
                    styles["Normal"],
                ),
                Paragraph(
                    f'<font size="20"><b>PRESUPUESTO</b></font><br/><font size="9" color="#6b7280">#{budget.id:03d}</font>',
                    styles["Normal"],
                ),
            ]
        ]
        header_table = Table(header_data, colWidths=[250, 270])
        header_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), indigo),
                    ("TEXTCOLOR", (0, 0), (-1, -1), white),
                    ("PADDING", (0, 0), (-1, -1), 16),
                    ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ROUNDEDCORNERS", [8, 8, 8, 8]),
                ]
            )
        )
        elements.append(header_table)
        elements.append(Spacer(1, 20))

        info_data = [
            [
                Paragraph(
                    f"""
                <b>Cliente</b><br/>
                <font size="11">{budget.client.name}</font><br/>
                <font color="#6b7280">{budget.client.email}</font><br/>
                <font color="#6b7280">{budget.client.phone if budget.client.phone else ""}</font>
            """,
                    styles["Normal"],
                ),
                Paragraph(
                    f"""
                <b>Detalles</b><br/>
                <font color="#6b7280">Fecha de emisión:</font> {datetime.now().strftime("%d/%m/%Y")}<br/>
                <font color="#6b7280">Válido hasta:</font> {budget.valid_until.strftime("%d/%m/%Y") if budget.valid_until else "Sin fecha límite"}<br/>
                <font color="#6b7280">Estado:</font> {"Enviado"}
            """,
                    styles["Normal"],
                ),
            ]
        ]
        info_table = Table(info_data, colWidths=[260, 260])
        info_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), gray_light),
                    ("PADDING", (0, 0), (-1, -1), 16),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LINEAFTER", (0, 0), (0, -1), 1, colors.HexColor("#e5e7eb")),
                ]
            )
        )
        elements.append(info_table)
        elements.append(Spacer(1, 24))

        elements.append(Paragraph("<b>Tratamientos incluidos</b>", styles["Normal"]))
        elements.append(Spacer(1, 8))

        items_data = [["Descripción", "Cantidad", "Precio unitario", "Subtotal"]]
        for item in budget.items:
            items_data.append(
                [
                    Paragraph(f"<b>{item.description}</b>", styles["Normal"]),
                    str(item.quantity),
                    f"€{item.unit_price}",
                    f"€{item.subtotal}",
                ]
            )

        items_table = Table(items_data, colWidths=[240, 70, 100, 110])
        items_table.setStyle(
            TableStyle(
                [
                    # Header
                    ("BACKGROUND", (0, 0), (-1, 0), indigo),
                    ("TEXTCOLOR", (0, 0), (-1, 0), white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("PADDING", (0, 0), (-1, 0), 10),
                    # Filas
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                    ("PADDING", (0, 1), (-1, -1), 10),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, gray_light]),
                    # Alineación
                    ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                    ("ALIGN", (3, 0), (3, -1), "RIGHT"),
                    ("ALIGN", (2, 0), (2, -1), "RIGHT"),
                    # Bordes
                    ("LINEBELOW", (0, 0), (-1, 0), 1, indigo),
                    ("LINEBELOW", (0, 1), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        elements.append(items_table)
        elements.append(Spacer(1, 0))

        total_data = [["", "", "TOTAL", f"€{budget.total}"]]
        total_table = Table(total_data, colWidths=[240, 70, 100, 110])
        total_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (2, 0), (-1, -1), indigo),
                    ("TEXTCOLOR", (2, 0), (-1, -1), white),
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 11),
                    ("PADDING", (0, 0), (-1, -1), 12),
                    ("ALIGN", (2, 0), (-1, -1), "CENTER"),
                    ("ALIGN", (3, 0), (3, -1), "RIGHT"),
                ]
            )
        )
        elements.append(total_table)
        elements.append(Spacer(1, 24))

        if budget.notes:
            notes_data = [
                [
                    Paragraph(
                        f'<b>Notas</b><br/><font color="#6b7280">{budget.notes}</font>',
                        styles["Normal"],
                    )
                ]
            ]
            notes_table = Table(notes_data, colWidths=[520])
            notes_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), indigo_light),
                        ("PADDING", (0, 0), (-1, -1), 12),
                        ("LINERIGHT", (0, 0), (0, -1), 3, indigo),
                    ]
                )
            )
            elements.append(notes_table)
            elements.append(Spacer(1, 24))

        footer_data = [
            [
                Paragraph(
                    '<font size="8" color="#6b7280">KareCare · Clínica Dental · Este presupuesto tiene validez durante 30 días desde su emisión.</font>',
                    styles["Normal"],
                )
            ]
        ]
        footer_table = Table(footer_data, colWidths=[520])
        footer_table.setStyle(
            TableStyle(
                [
                    ("LINEABOVE", (0, 0), (-1, -1), 1, colors.HexColor("#e5e7eb")),
                    ("PADDING", (0, 0), (-1, -1), 12),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ]
            )
        )
        elements.append(footer_table)

        doc.build(elements)
        pdf_data = base64.b64encode(buffer.getvalue()).decode("utf-8")

        resend.api_key = os.getenv("RESEND_API_KEY")

        resend.Emails.send(
            {
                "from": "KareCare <onboarding@resend.dev>",
                "to": "angeld0606@gmail.com",
                "subject": f"Presupuesto #{budget.id:03d} - KareCare",
                "html": f"""
                <h2>Hola {budget.client.name},</h2>
                <p>Adjunto encontrarás tu presupuesto de KareCare.</p>
                <p>Total: <strong>€{budget.total}</strong></p>
                <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                <br>
                <p>Un saludo,<br>El equipo de KareCare</p>
            """,
                "attachments": [
                    {
                        "filename": f"presupuesto_{budget.id:03d}.pdf",
                        "content": pdf_data,
                    }
                ],
            }
        )

        budget.status = "sent"
        db.session.commit()

        return (
            jsonify(
                {
                    "message": f"Presupuesto enviado correctamente a {budget.client.email}",
                    "budget": budget.to_dict(),
                }
            ),
            200,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
