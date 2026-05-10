from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, create_access_token
from models import db, User, CallLog, ChatHistory, Report
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
        total_calls = CallLog.query.count()
        total_chats = ChatHistory.query.count()
        total_reports = Report.query.count()

        return jsonify({
            'total_users': total_users,
            'total_calls': total_calls,
            'total_chats': total_chats,
            'total_reports': total_reports
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/users', methods=['GET'])
@jwt_required()
def get_users():
    try:
        users = User.query.all()
        return jsonify([{
            'id': u.id,
            'name': u.name,
            'email': u.email,
            'created_at': u.created_at.isoformat() if u.created_at else None
        } for u in users])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/calls', methods=['GET'])
@jwt_required()
def get_calls():
    try:
        calls = CallLog.query.all()
        return jsonify([{
            'id': c.id,
            'user_id': c.user_id,
            'peer_id': c.peer_id,
            'duration': c.duration,
            'transcript': c.transcript,
            'created_at': c.started_at.isoformat() if c.started_at else None
        } for c in calls])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/reports', methods=['GET'])
@jwt_required()
def get_reports():
    try:
        reports = Report.query.all()
        return jsonify([{
            'id': r.id,
            'user_id': r.user_id,
            'name': r.name,
            'type': r.type,
            'message': r.message,
            'created_at': r.created_at.isoformat() if r.created_at else None
        } for r in reports])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/tables', methods=['GET'])
@jwt_required()
def get_tables():
    try:
        conn = sqlite3.connect('instance/app.db')
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        conn.close()
        return jsonify({'tables': tables})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/table/<table_name>', methods=['GET'])
@jwt_required()
def get_table_data(table_name):
    try:
        conn = sqlite3.connect('instance/app.db')
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
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/table/<table_name>', methods=['POST'])
@jwt_required()
def update_table_data(table_name):
    try:
        data = request.get_json()
        action = data.get('action')
        row_id = data.get('id')

        if action == 'delete' and row_id:
            conn = sqlite3.connect('instance/app.db')
            cursor = conn.cursor()
            cursor.execute("DELETE FROM {} WHERE id = ?".format(table_name), (row_id,))
            conn.commit()
            conn.close()
            return jsonify({'success': True})

        return jsonify({'error': 'Invalid action'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500