from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, ChatHistory
from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()

chat_bp = Blueprint('chat', __name__)
client = Groq(api_key=os.getenv('GROQ_API_KEY'))

SYSTEM_PROMPT = (
    'You are Bridge, a friendly assistant for VoiceBridge — an accessibility '
    'app for people with speech and hearing disabilities. Be warm, helpful '
    'and concise.'
)

@chat_bp.route('/chat', methods=['POST', 'OPTIONS'])
@jwt_required()
def chat():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OK'}), 200
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    message = data.get('message', '').strip()

    if not message:
        return jsonify({'error': 'Empty message'}), 400

    # Build conversation history
    try:
        past = (
            ChatHistory.query
            .filter_by(user_id=user_id)
            .order_by(ChatHistory.created_at.desc())
            .limit(20)
            .all()
        )
        past.reverse()
    except Exception as hist_err:
        print(f'[Chat] Error loading history: {hist_err}')
        past = []

    messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]
    for row in past:
        role = 'assistant' if row.role == 'bot' else 'user'
        messages.append({'role': role, 'content': row.message})

    messages.append({'role': 'user', 'content': message})

    # Save user message
    try:
        new_chat = ChatHistory(user_id=user_id, role='user', message=message)
        db.session.add(new_chat)
        db.session.commit()
    except Exception as save_err:
        print(f'[Chat] Error saving user message: {save_err}')
        db.session.rollback()
        return jsonify({'error': 'Failed to save message'}), 500

    # Call Groq API
    try:
        if not client:
            return jsonify({'error': 'Groq client not initialized'}), 500
            
        response = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=messages,
        )
        
        if not response or not response.choices:
            return jsonify({'error': 'No response from AI service'}), 502
            
        reply = response.choices[0].message.content

        if not reply:
            return jsonify({'error': 'Empty reply from AI service'}), 502

        # Save bot reply
        try:
            bot_chat = ChatHistory(user_id=user_id, role='bot', message=reply)
            db.session.add(bot_chat)
            db.session.commit()
        except Exception as bot_save_err:
            print(f'[Chat] Error saving bot reply: {bot_save_err}')
            db.session.rollback()
            # Still return the reply even if saving failed
            pass

        return jsonify({'reply': reply})

    except Exception as exc:
        print(f'[Chat] AI service error: {str(exc)}')
        db.session.rollback()
        return jsonify({'error': f'AI service error: {str(exc)}'}), 502


@chat_bp.route('/chat/history', methods=['GET', 'OPTIONS'])
@jwt_required()
def get_history():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OK'}), 200
    user_id = get_jwt_identity()
    rows = (
        ChatHistory.query
        .filter_by(user_id=user_id)
        .order_by(ChatHistory.created_at)
        .all()
    )
    return jsonify([
        {'role': r.role, 'message': r.message, 'time': r.created_at.isoformat()}
        for r in rows
    ])