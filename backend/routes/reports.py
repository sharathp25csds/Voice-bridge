from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, Report

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/api/reports', methods=['POST'])
def submit_report():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({'error': 'Invalid or missing JSON data'}), 400

        type_   = data.get('type', '').strip()
        message = data.get('message', '').strip()
        name    = (data.get('name') or 'Anonymous').strip()[:100]
        email   = (data.get('email') or '').strip()[:120]
        user_id = data.get('user_id')

        if not type_ or not message:
            return jsonify({'error': 'Type and message are required'}), 400

        if len(type_) > 100 or len(message) > 2000:
            return jsonify({'error': 'Input exceeds maximum allowed length'}), 400

        report = Report(
            name        = name,
            email       = email,
            report_type = type_,
            message     = message,
            user_id     = user_id
        )

        db.session.add(report)
        db.session.commit()
        return jsonify({'saved': True, 'id': report.id}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to save report', 'details': str(e)}), 500


@reports_bp.route('/api/reports', methods=['GET'])
@jwt_required()
def get_reports():
    try:
        rows = Report.query.order_by(Report.created_at.desc()).all()

        return jsonify([
            {
                'id':      r.id,
                'name':    r.name,
                'email':   r.email,
                'type':    r.report_type,
                'message': r.message,
                'status':  r.status,
                'time':    r.created_at.isoformat() if r.created_at else None
            }
            for r in rows
        ]), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to fetch reports', 'details': str(e)}), 500