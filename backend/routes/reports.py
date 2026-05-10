from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Report

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/api/reports', methods=['POST'])
def submit_report():
    data    = request.get_json()
    type_   = data.get('type', '').strip()
    message = data.get('message', '').strip()

    if not type_ or not message:
        return jsonify({'error': 'Type and message are required'}), 400

    db.session.add(Report(
        name    = data.get('name', 'Anonymous'),
        type    = type_,
        message = message
    ))
    db.session.commit()
    return jsonify({'saved': True}), 201


@reports_bp.route('/api/reports', methods=['GET'])
@jwt_required()
def get_reports():
    rows = Report.query.order_by(Report.created_at.desc()).all()
    return jsonify([
        {
            'id':      r.id,
            'name':    r.name,
            'type':    r.type,
            'message': r.message,
            'time':    r.created_at.isoformat()
        }
        for r in rows
    ])