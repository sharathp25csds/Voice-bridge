from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import tempfile
import os

load_dotenv()

# ── Groq client setup ──────────────────────────────────────────────────────────
try:
    from groq import Groq
    groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))
except ImportError:
    groq_client = None
    print("[WARNING] Groq SDK not installed. Run: pip install groq")

# ── App blueprints ─────────────────────────────────────────────────────────────
from models import db
from routes.auth    import auth_bp, bcrypt
from routes.chat    import chat_bp
from routes.calls   import calls_bp
from routes.reports import reports_bp
from routes.admin   import admin_bp

# ── Flask app setup ────────────────────────────────────────────────────────────
app = Flask(__name__)

app.config['SECRET_KEY']                     = os.getenv('SECRET_KEY')
app.config['JWT_SECRET_KEY']                 = os.getenv('JWT_SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI']        = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, resources={r"/*": {"origins": "*"}})

db.init_app(app)
bcrypt.init_app(app)
JWTManager(app)

app.register_blueprint(auth_bp,    url_prefix='/api')
app.register_blueprint(chat_bp,    url_prefix='/api')
app.register_blueprint(calls_bp,   url_prefix='/api')
app.register_blueprint(reports_bp, url_prefix='/api')
app.register_blueprint(admin_bp,   url_prefix='/api')


# ── Helpers ────────────────────────────────────────────────────────────────────
def clean_transcript(text: str) -> str:
    """
    Clean and format transcript while preserving Unicode characters for Indian languages.
    Supports: English, Hindi, Kannada, Tamil, Telugu, Marathi, Malayalam
    """
    result = text.strip().replace('\n', ' ').replace('  ', ' ').strip()
    
    # Preserve Unicode for Indian languages - only clean ASCII punctuation
    result = result.replace(' ,', ',').replace(' .', '.').replace(' !', '!').replace(' ?', '?')
    result = result.replace(' ;', ';').replace(' :', ':')
    result = result.replace('..', '.')
    result = ' '.join(result.split())
    
    # Only apply English-specific fixes if text contains primarily ASCII
    if ord(result[0]) < 128:  # First character is ASCII
        result = result.replace(' i ', ' I ')
    
    if result and result[-1] not in '.!?।':  # Added Indian punctuation mark
        result += '.'
    
    if result and ord(result[0]) < 128:  # First character is ASCII
        result = result[0].upper() + result[1:]
    
    return result


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.route('/api/transcribe', methods=['POST', 'OPTIONS'])
def transcribe_audio():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OK'}), 200
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file uploaded'}), 400

    if groq_client is None:
        return jsonify({'error': 'Groq SDK not installed. Run: pip install groq'}), 500

    groq_api_key = os.getenv('GROQ_API_KEY')
    if not groq_api_key:
        return jsonify({'error': 'GROQ_API_KEY not configured in .env'}), 500

    audio_file = request.files['audio']
    language   = request.form.get('language', 'en')
    model      = os.getenv('GROQ_TRANSCRIBE_MODEL', 'whisper-large-v3')

    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as out_file:
        audio_file.save(out_file.name)
        temp_path = out_file.name

    try:
        with open(temp_path, 'rb') as audio_stream:
            transcript = groq_client.audio.transcriptions.create(
                file=("audio.webm", audio_stream),
                model=model,
                language=language,
                temperature=0,
            )

        text = transcript.text if hasattr(transcript, 'text') else ''

        if not text:
            return jsonify({'transcript': ''}), 200

        # Ensure UTF-8 encoding for Indian language transcripts
        cleaned = clean_transcript(text)
        response = jsonify({'transcript': cleaned})
        response.headers['Content-Type'] = 'application/json; charset=utf-8'
        return response

    except Exception as exc:
        return jsonify({'error': str(exc)}), 500

    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass


@app.route('/api/health', methods=['GET'])
def health_check():
    groq_configured = bool(os.getenv('GROQ_API_KEY'))
    return jsonify({
        'status': 'ok',
        'groq_configured': groq_configured,
        'groq_sdk': groq_client is not None,
    }), 200


# ── DB init & startup ──────────────────────────────────────────────────────────
with app.app_context():
    db.create_all()
    print("[OK] Database tables created!")

if __name__ == '__main__':
    print("[START] VoiceBridge backend starting...")
    app.run(debug=True, port=5000)