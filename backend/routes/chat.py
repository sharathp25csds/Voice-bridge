from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, ChatHistory
from groq import Groq
import os

chat_bp = Blueprint('chat', __name__)
client  = Groq(api_key=os.getenv('GROQ_API_KEY'))

@chat_bp.route('/api/chat', methods=['POST'])
@jwt_required()
def chat():
    user_id = get_jwt_identity()
    message = request.get_json().get('message', '').strip()
    if not message:
        return jsonify({'error': 'Empty message'}), 400

    db.session.add(ChatHistory(user_id=user_id, role='user', message=message))

    response = client.chat.completions.create(
        model='llama-3.3-70b-versatile',
        messages=[
            {'role': 'system', 'content': 'You are Bridge, a friendly assistant for VoiceBridge — an accessibility app for people with speech and hearing disabilities. Be warm, helpful and concise.'},
            {'role': 'user', 'content': message}
        ]
    )
    reply = response.choices[0].message.content

    db.session.add(ChatHistory(user_id=user_id, role='bot', message=reply))
    db.session.commit()

    return jsonify({'reply': reply})


@chat_bp.route('/api/chat/history', methods=['GET'])
@jwt_required()
def get_history():
    user_id = get_jwt_identity()
    rows    = ChatHistory.query.filter_by(user_id=user_id).order_by(ChatHistory.created_at).all()
    return jsonify([
        {'role': r.role, 'message': r.message, 'time': r.created_at.isoformat()}
        for r in rows
    ])