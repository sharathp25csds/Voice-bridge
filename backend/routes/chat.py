from flask import Flask, Blueprint, request, jsonify
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from flask_cors import CORS
from models import db, ChatHistory
from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')

db.init_app(app)
jwt = JWTManager(app)

chat_bp = Blueprint('chat', __name__)
client = Groq(api_key=os.getenv('GROQ_API_KEY'))

SYSTEM_PROMPT = (
    'You are Bridge, a friendly assistant for VoiceBridge — an accessibility '
    'app for people with speech and hearing disabilities. Be warm, helpful '
    'and concise.'
)

@chat_bp.route('/api/chat', methods=['POST'])
@jwt_required()
def chat():
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
    except Exception:
        past = []

    messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]
    for row in past:
        role = 'assistant' if row.role == 'bot' else 'user'
        messages.append({'role': role, 'content': row.message})

    messages.append({'role': 'user', 'content': message})

    # Save user message
    new_chat = ChatHistory(user_id=user_id, role='user', message=message)
    db.session.add(new_chat)
    db.session.commit()

    # Call Groq API  ← FIXED: try/except now properly structured
    try:
        response = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=messages,
        )
        reply = response.choices[0].message.content

        # Save bot reply  ← FIXED: moved inside try, after getting reply
        db.session.add(ChatHistory(user_id=user_id, role='bot', message=reply))
        db.session.commit()

        return jsonify({'reply': reply})  # ← FIXED: moved inside try

    except Exception as exc:           # ← FIXED: except now has proper variable
        db.session.rollback()          # ← FIXED: rollback only on error
        return jsonify({'error': f'AI service error: {str(exc)}'}), 502


@chat_bp.route('/api/chat/history', methods=['GET'])
@jwt_required()
def get_history():
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

app.register_blueprint(chat_bp)

if __name__ == '__main__':
    app.run(debug=True)