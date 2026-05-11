from flask import Blueprint, jsonify, request
from sqlalchemy import select
from extensions import db
from app.models import Budget, BudgetItem, Clients, Businesses, Services
from app.utils.decorators import admin_required, user_or_admin_required
from decimal import Decimal
from datetime import datetime, timedelta
import resend
import os
import io
import base64
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle

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

        budget = Budget(
            client_id=data["client_id"],
            business_id=data["business_id"],
            notes=data.get("notes"),
            valid_until=datetime.now() + timedelta(days=30),
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

        valid_until_str = (
            budget.valid_until.strftime("%d/%m/%Y")
            if budget.valid_until
            else (datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")
        )

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40,
        )
        
        elements = []
        
        styles = getSampleStyleSheet()
        white_style = ParagraphStyle('white', parent=styles["Normal"], textColor=colors.white)

        dark_blue = colors.HexColor("#1e1b4b")
        indigo_light = colors.HexColor("#eef2ff")
        gray_light = colors.HexColor("#f9fafb")
        white = colors.white

        header_data = [
            [
                Paragraph('<font size="18"><b>KareCare</b></font>', white_style),
                Paragraph('<font size="10">PRESUPUESTO</font>', white_style),
            ],
            [
                Paragraph('<font size="9">Clínica Dental</font>', white_style),
                Paragraph(f'<font size="18"><b>#{budget.id:03d}</b></font>', white_style),
            ]
        ]
        header_table = Table(header_data, colWidths=[250, 270])
        header_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), dark_blue),
                    ("TEXTCOLOR", (0, 0), (-1, -1), white),
                    ("PADDING", (0, 0), (-1, -1), 8),
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, 0), 16),
                    ("BOTTOMPADDING", (0, -1), (-1, -1), 16),
                ]
            )
        )
        elements.append(header_table)
        elements.append(Spacer(1, 20))

        info_data = [
            [
                Paragraph(
                    f"""<b>Cliente</b><br/>
                    <font size="11">{budget.client.name}</font><br/>
                    <font color="#6b7280">{budget.client.email}</font><br/>
                    <font color="#6b7280">{budget.client.phone if budget.client.phone else ""}</font>""",
                    styles["Normal"],
                ),
                Paragraph(
                    f"""<b>Detalles</b><br/>
                    <font color="#6b7280">Fecha de emisión:</font> {datetime.now().strftime("%d/%m/%Y")}<br/>
                    <font color="#6b7280">Válido hasta:</font> {valid_until_str}<br/>
                    <font color="#6b7280">Estado:</font> Enviado""",
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
                    ("BACKGROUND", (0, 0), (-1, 0), dark_blue),
                    ("TEXTCOLOR", (0, 0), (-1, 0), white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("PADDING", (0, 0), (-1, 0), 10),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                    ("PADDING", (0, 1), (-1, -1), 10),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, gray_light]),
                    ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                    ("ALIGN", (3, 0), (3, -1), "RIGHT"),
                    ("ALIGN", (2, 0), (2, -1), "RIGHT"),
                    ("LINEBELOW", (0, 0), (-1, 0), 1, dark_blue),
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
                    ("BACKGROUND", (2, 0), (-1, -1), dark_blue),
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
                        ("LINEBEFORE", (0, 0), (0, -1), 3, dark_blue),
                    ]
                )
            )
            elements.append(notes_table)
            elements.append(Spacer(1, 24))

        footer_data = [
            [
                Paragraph(
                    '<font size="8">KareCare · Clínica Dental · Este presupuesto tiene validez de 30 días desde su emisión.</font>',
                    white_style,
                )
            ]
        ]
        footer_table = Table(footer_data, colWidths=[520])
        footer_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), dark_blue),
                    ("TEXTCOLOR", (0, 0), (-1, -1), white),
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
                "to": "angeld0606@gmail.com", #budget.client.email,
                "subject": f"Presupuesto #{budget.id:03d} - KareCare",
                "html": f"""<!DOCTYPE html>
                            <html>
                            <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            </head>
                            <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 20px;">
                                <tr>
                                <td align="center">
                                    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

                                    <tr>
                                        <td style="background-color:#1e1b4b;border-radius:12px 12px 0 0;padding:32px 40px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                            <td>
                                                <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">KareCare</p>
                                                <p style="margin:4px 0 0;font-size:13px;color:#c7d2fe;">Clínica Dental</p>
                                            </td>
                                            <td align="right">
                                                <p style="margin:0;font-size:13px;color:#c7d2fe;text-transform:uppercase;letter-spacing:1px;">Presupuesto</p>
                                                <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#ffffff;">#{budget.id:03d}</p>
                                            </td>
                                            </tr>
                                        </table>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="background-color:#ffffff;padding:40px;">

                                        <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111827;">Hola, {budget.client.name}</p>
                                        <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">
                                            Te enviamos tu presupuesto de tratamiento dental. Puedes encontrar el detalle completo en el PDF adjunto.
                                        </p>

                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                                            <tr>
                                            <td width="48%" style="background-color:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;">
                                                <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Cliente</p>
                                                <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">{budget.client.name}</p>
                                                <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">{budget.client.email}</p>
                                            </td>
                                            <td width="4%"></td>
                                            <td width="48%" style="background-color:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0;">
                                                <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Detalles</p>
                                                <p style="margin:0;font-size:13px;color:#6b7280;">Emitido: <span style="color:#111827;font-weight:500;">{datetime.now().strftime("%d/%m/%Y")}</span></p>
                                                <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Válido hasta: <span style="color:#111827;font-weight:500;">{valid_until_str}</span></p>
                                            </td>
                                            </tr>
                                        </table>

                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:0;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
                                            <tr style="background-color:#1e1b4b;">
                                            <td style="padding:12px 16px;font-size:12px;font-weight:600;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">Tratamiento</td>
                                            <td align="center" style="padding:12px 16px;font-size:12px;font-weight:600;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">Cant.</td>
                                            <td align="right" style="padding:12px 16px;font-size:12px;font-weight:600;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">Precio</td>
                                            <td align="right" style="padding:12px 16px;font-size:12px;font-weight:600;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">Subtotal</td>
                                            </tr>
                                            {"".join([f'''<tr style="background-color:{"#ffffff" if i % 2 == 0 else "#f8fafc"};">
                                            <td style="padding:12px 16px;font-size:14px;color:#111827;font-weight:500;">{item.description}</td>
                                            <td align="center" style="padding:12px 16px;font-size:14px;color:#6b7280;">{item.quantity}</td>
                                            <td align="right" style="padding:12px 16px;font-size:14px;color:#6b7280;">€{item.unit_price}</td>
                                            <td align="right" style="padding:12px 16px;font-size:14px;color:#111827;font-weight:500;">€{item.subtotal}</td>
                                            </tr>''' for i, item in enumerate(budget.items)])}
                                            <tr style="background-color:#1e1b4b;">
                                            <td colspan="3" style="padding:14px 16px;font-size:13px;font-weight:700;color:#ffffff;text-align:right;text-transform:uppercase;letter-spacing:0.5px;">Total</td>
                                            <td align="right" style="padding:14px 16px;font-size:18px;font-weight:700;color:#ffffff;">€{budget.total}</td>
                                            </tr>
                                        </table>

                                        {"" if not budget.notes else f'''<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                                            <tr>
                                            <td style="background-color:#eef2ff;border-left:4px solid #4f46e5;border-radius:0 8px 8px 0;padding:16px 20px;">
                                                <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#4f46e5;text-transform:uppercase;letter-spacing:0.5px;">Notas</p>
                                                <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">{budget.notes}</p>
                                            </td>
                                            </tr>
                                        </table>'''}

                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                                            <tr>
                                            <td style="background-color:#f8fafc;border-radius:8px;padding:20px;text-align:center;border:1px solid #e2e8f0;">
                                                <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">¿Tienes alguna pregunta?</p>
                                                <p style="margin:0;font-size:14px;color:#111827;font-weight:500;">Contacta con nosotros y te atenderemos encantados.</p>
                                            </td>
                                            </tr>
                                        </table>

                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="background-color:#1e1b4b;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
                                        <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">KareCare · Clínica Dental</p>
                                        <p style="margin:8px 0 0;font-size:12px;color:#a5b4fc;">Este presupuesto tiene validez durante 30 días desde su emisión.</p>
                                        </td>
                                    </tr>

                                    </table>
                                </td>
                                </tr>
                            </table>
                            </body>
                            </html>""",
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
