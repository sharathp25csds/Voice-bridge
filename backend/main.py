from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import tempfile
import os

load_dotenv()

try:
    import openai
    openai.api_key = os.getenv('OPENAI_API_KEY', '')
except ImportError:
    openai = None

from models import db
from routes.auth    import auth_bp, bcrypt
from routes.chat    import chat_bp
from routes.calls   import calls_bp
from routes.reports import reports_bp
from routes.admin   import admin_bp

app = Flask(__name__)

app.config['SECRET_KEY']                     = os.getenv('SECRET_KEY')
app.config['JWT_SECRET_KEY']                 = os.getenv('JWT_SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI']        = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, origins="*", supports_credentials=True)

db.init_app(app)
bcrypt.init_app(app)
JWTManager(app)

app.register_blueprint(auth_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(calls_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(admin_bp)


def clean_transcript(text: str) -> str:
    result = text.strip().replace('\n', ' ').replace('  ', ' ').strip()
    result = result.replace(' ,', ',').replace(' .', '.').replace(' !', '!').replace(' ?', '?')
    result = result.replace(' ;', ';').replace(' :', ':')
    result = result.replace('..', '.')
    result = ' '.join(result.split())
    result = result.replace(' i ', ' I ')

    if result and result[-1] not in '.!?':
        result += '.'
    if result:
        result = result[0].upper() + result[1:]
    return result


@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file uploaded'}), 400

    audio_file = request.files['audio']
    language   = request.form.get('language', 'en-IN')
    model      = os.getenv('OPENAI_TRANSCRIBE_MODEL', 'whisper-1')

    if openai is None:
        return jsonify({'error': 'OpenAI SDK not installed. Run pip install -r requirements.txt'}), 500

    if not openai.api_key:
        return jsonify({'error': 'OpenAI API key not configured'}), 500

    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as out_file:
        audio_file.save(out_file.name)
        temp_path = out_file.name

    try:
        with open(temp_path, 'rb') as audio_stream:
            if hasattr(openai.Audio, 'transcribe'):
                transcript = openai.Audio.transcribe(
                    file=audio_stream,
                    model=model,
                    language=language,
                    temperature=0,
                )
            else:
                transcript = openai.Audio.transcriptions.create(
                    file=audio_stream,
                    model=model,
                    language=language,
                    temperature=0,
                )

        if isinstance(transcript, dict):
            text = transcript.get('text', '')
        else:
            text = getattr(transcript, 'text', '') or getattr(transcript, 'transcript', '')

        if not text:
            return jsonify({'error': 'Empty transcription result'}), 500

        return jsonify({'transcript': clean_transcript(text)})
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200


with app.app_context():
    db.create_all()
    print("✅ Database tables created!")

if __name__ == '__main__':
    print("🚀 VoiceBridge backend starting...")
    app.run(debug=True, port=5000)