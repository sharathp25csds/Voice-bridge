from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, create_access_token
from models import db, User, CallLog, ChatHistory, Report, CallSession
import os
import sqlite3
import csv
from io import StringIO

admin_bp = Blueprint('admin', __name__)

# Admin credentials from env
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD')

@admin_bp.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    if email != ADMIN_EMAIL or password != ADMIN_PASSWORD:
        return jsonify({'error': 'Invalid credentials'}), 401

    token = create_access_token(identity='admin')
    return jsonify({'token': token})

@admin_bp.route('/api/admin/stats', methods=['GET'])
@jwt_required()
def get_stats():
    try:
        total_users = User.query.count()
        total_calls = CallSession.query.count()
        total_chats = ChatHistory.query.count()
        total_reports = Report.query.count()

        return jsonify({
            'total_users': total_users,
            'total_calls': total_calls,
            'total_chats': total_chats,
            'total_reports': total_reports
        })
    except Exception as e:
        print(f"Stats Error: {str(e)}")
        return jsonify({'error': f"Database error: {str(e)}"}), 500

@admin_bp.route('/api/admin/users', methods=['GET'])
@jwt_required()
def get_users():
    try:
        users = User.query.order_by(User.created_at.desc()).all()
        return jsonify([{
            'id': u.id,
            'name': u.name,
            'email': u.email,
            'created_at': u.created_at.isoformat() if u.created_at else None
        } for u in users])
    except Exception as e:
        print(f"Users Fetch Error: {str(e)}")
        return jsonify({'error': f"Failed to fetch users: {str(e)}"}), 500

@admin_bp.route('/api/admin/calls', methods=['GET'])
@jwt_required()
def get_calls():
    try:
        # Join with User to get names
        sessions = CallSession.query.outerjoin(User, CallSession.user_id == User.id).all()
        return jsonify([{
            'user_id': s.user_id,
            'user_name': s.user.name if s.user else "Unknown User",
            'duration': s.duration,
            'started_at': s.started_at.isoformat() if s.started_at else None,
            'ended_at': s.ended_at.isoformat() if s.ended_at else None,
            'feature_used': s.feature_used or "Communication Suite",
            'date': s.created_at.strftime('%Y-%m-%d') if s.created_at else None
        } for s in sessions])
    except Exception as e:
        print(f"Calls Fetch Error: {str(e)}")
        return jsonify({'error': f"Failed to fetch transcripts: {str(e)}"}), 500

@admin_bp.route('/api/admin/chats', methods=['GET'])
@jwt_required()
def get_chats():
    try:
        chats = ChatHistory.query.all()
        return jsonify([{
            'id': c.id,
            'user_id': c.user_id,
            'role': c.role,
            'message': c.message,
            'created_at': c.created_at.isoformat() if c.created_at else None
        } for c in chats])
    except Exception as e:
        print(f"Chats Fetch Error: {str(e)}")
        return jsonify({'error': f"Failed to fetch chats: {str(e)}"}), 500

@admin_bp.route('/api/admin/reports', methods=['GET'])
@jwt_required()
def get_reports():
    try:
        reports = Report.query.order_by(Report.created_at.desc()).all()
        return jsonify([{
            'id': r.id,
            'user_id': r.user_id,
            'name': r.name,
            'email': r.email,
            'type': r.report_type,
            'message': r.message,
            'status': r.status,
            'created_at': r.created_at.isoformat() if r.created_at else None
        } for r in reports])
    except Exception as e:
        print(f"Reports Fetch Error: {str(e)}")
        return jsonify({'error': f"Failed to fetch reports: {str(e)}"}), 500

@admin_bp.route('/api/admin/reports/<int:report_id>', methods=['PUT'])
@jwt_required()
def update_report(report_id):
    try:
        data = request.get_json()
        report = Report.query.get(report_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404
        
        if 'status' in data:
            report.status = data['status']
        
        db.session.commit()
        return jsonify({'success': True, 'status': report.status})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/reports/<int:report_id>', methods=['DELETE'])
@jwt_required()
def delete_report(report_id):
    try:
        report = Report.query.get(report_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404
        
        db.session.delete(report)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Helper to get DB path
def get_db_path():
    # Try multiple locations to find the database
    paths = [
        'instance/voicebridge.db',
        'backend/instance/voicebridge.db',
        '../instance/voicebridge.db'
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return 'instance/voicebridge.db' # Default

@admin_bp.route('/api/admin/tables', methods=['GET'])
@jwt_required()
def get_tables():
    try:
        conn = sqlite3.connect(get_db_path())
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        conn.close()
        return jsonify({'tables': tables})
    except Exception as e:
        return jsonify({'error': f"DB Inspector Error: {str(e)}"}), 500

@admin_bp.route('/api/admin/table/<table_name>', methods=['GET'])
@jwt_required()
def get_table_data(table_name):
    try:
        conn = sqlite3.connect(get_db_path())
        cursor = conn.cursor()

        # Get columns
        cursor.execute("PRAGMA table_info({})".format(table_name))
        columns = [row[1] for row in cursor.fetchall()]

        # Get data
        cursor.execute("SELECT * FROM {}".format(table_name))
        rows = cursor.fetchall()

        conn.close()

        data = []
        for row in rows:
            data.append(dict(zip(columns, row)))

        return jsonify({'columns': columns, 'rows': data})
    except Exception as e:
        return jsonify({'error': f"Table Data Error: {str(e)}"}), 500

@admin_bp.route('/api/admin/table/<table_name>', methods=['POST'])
@jwt_required()
def update_table_data(table_name):
    try:
        data = request.get_json()
        action = data.get('action')
        row_id = data.get('id')

        if action == 'delete' and row_id:
            conn = sqlite3.connect('instance/voicebridge.db')
            cursor = conn.cursor()
            cursor.execute("DELETE FROM {} WHERE id = ?".format(table_name), (row_id,))
            conn.commit()
            conn.close()
            return jsonify({'success': True})

        return jsonify({'error': 'Invalid action'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500