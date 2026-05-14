from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from models import db, CallLog, CallSession, CallCaption
from datetime import datetime
import uuid

calls_bp = Blueprint('calls', __name__)

def parse_iso_datetime(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def generate_session_id():
    return uuid.uuid4().hex


@calls_bp.route('/calls', methods=['POST', 'OPTIONS'])
@jwt_required()
def save_call():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OK'}), 200
    user_id = get_jwt_identity()
    data    = request.get_json() or {}

    log = CallLog(
        user_id    = user_id,
        peer_id    = data.get('peer_id', ''),
        duration   = data.get('duration', 0),
        transcript = data.get('transcript', '')
    )
    db.session.add(log)

    # Optional enhanced session and caption storage
    session_id = data.get('session_id') or generate_session_id()
    call_session = CallSession(
        user_id      = user_id,
        contact_name = data.get('contact_name', '') or data.get('peer_id', ''),
        session_id   = session_id,
        language     = data.get('language', 'en-IN'),
        started_at   = parse_iso_datetime(data.get('started_at')) or datetime.utcnow(),
        ended_at     = parse_iso_datetime(data.get('ended_at')),
        duration     = data.get('duration', 0)
    )
    db.session.add(call_session)
    db.session.flush()

    captions = data.get('captions') or []
    if isinstance(captions, list):
        for item in captions:
            caption = CallCaption(
                call_session_id = call_session.id,
                speaker         = item.get('speaker', 'Unknown'),
                caption_text    = item.get('caption_text') or item.get('text', ''),
                timestamp       = parse_iso_datetime(item.get('timestamp')),
                sequence_number = item.get('sequence_number') or 1
            )
            db.session.add(caption)

    db.session.commit()
    return jsonify({'saved': True, 'session_id': session_id}), 201


@calls_bp.route('/call-sessions', methods=['GET'])
@jwt_required()
def list_call_sessions():
    user_id = get_jwt_identity()
    page    = request.args.get('page', 1, type=int)
    limit   = request.args.get('limit', 10, type=int)
    search  = request.args.get('search', '', type=str)

    query = CallSession.query.filter_by(user_id=user_id)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                CallSession.contact_name.ilike(term),
                CallSession.session_id.ilike(term),
                CallSession.language.ilike(term)
            )
        )

    pagination = query.order_by(CallSession.started_at.desc()).paginate(page=page, per_page=limit, error_out=False)
    sessions = pagination.items

    return jsonify({
        'sessions': [
            {
                'id':            s.id,
                'session_id':    s.session_id,
                'contact_name':  s.contact_name,
                'language':      s.language,
                'started_at':    s.started_at.isoformat() if s.started_at else None,
                'ended_at':      s.ended_at.isoformat() if s.ended_at else None,
                'duration':      s.duration,
                'created_at':    s.created_at.isoformat() if s.created_at else None,
                'caption_count': len(s.captions)
            }
            for s in sessions
        ],
        'meta': {
            'page':       page,
            'limit':      limit,
            'total':      pagination.total,
            'pages':      pagination.pages
        }
    })


@calls_bp.route('/call-sessions/<int:session_id>', methods=['GET'])
@jwt_required()
def get_call_session(session_id):
    user_id = get_jwt_identity()
    session = CallSession.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    return jsonify({
        'id':            session.id,
        'session_id':    session.session_id,
        'contact_name':  session.contact_name,
        'language':      session.language,
        'started_at':    session.started_at.isoformat() if session.started_at else None,
        'ended_at':      session.ended_at.isoformat() if session.ended_at else None,
        'duration':      session.duration,
        'created_at':    session.created_at.isoformat() if session.created_at else None,
        'captions': [
            {
                'id':              c.id,
                'speaker':         c.speaker,
                'caption_text':    c.caption_text,
                'timestamp':       c.timestamp.isoformat() if c.timestamp else None,
                'sequence_number': c.sequence_number
            }
            for c in sorted(session.captions, key=lambda c: c.sequence_number)
        ]
    })


@calls_bp.route('/call-sessions/<int:session_id>', methods=['DELETE'])
@jwt_required()
def delete_call_session(session_id):
    user_id = get_jwt_identity()
    session = CallSession.query.filter_by(id=session_id, user_id=user_id).first()
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    db.session.delete(session)
    db.session.commit()
    return jsonify({'deleted': True}), 200


@calls_bp.route('/calls', methods=['GET'])
@jwt_required()
def get_calls():
    user_id = get_jwt_identity()
    rows    = CallLog.query.filter_by(user_id=user_id).order_by(CallLog.started_at.desc()).all()
    return jsonify([
        {
            'id':         r.id,
            'peer_id':    r.peer_id,
            'duration':   r.duration,
            'transcript': r.transcript,
            'started_at': r.started_at.isoformat()
        }
        for r in rows
    ])