from flask import Flask
from config import Config
from extensions import db, migrate, jwt, cors


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    with app.app_context():
        from app.routes.admins import admins_bp
        from app.routes.businesses import businesses_bp
        from app.routes.users import users_bp
        from app.routes.clients import clients_bp
        from app.routes.services import services_bp
        from app.routes.appointments import appointments_bp
        from app.routes.calendar import calendar_bp
        from app.routes.payments import payments_bp
        from app.routes.client_services import client_services_bp
        from app.routes.budgets import budgets_bp

        app.register_blueprint(admins_bp)
        app.register_blueprint(businesses_bp)
        app.register_blueprint(users_bp)
        app.register_blueprint(clients_bp)
        app.register_blueprint(services_bp)
        app.register_blueprint(appointments_bp)
        app.register_blueprint(calendar_bp)
        app.register_blueprint(payments_bp)
        app.register_blueprint(client_services_bp)
        app.register_blueprint(budgets_bp)

    return app
