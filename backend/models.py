from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'user'

    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(80), nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    call_logs     = db.relationship('CallLog',      backref='user',    lazy=True)
    reports       = db.relationship('Report',       backref='user',    lazy=True)
    call_sessions = db.relationship('CallSession',  backref='user',    lazy=True)
    chat_history  = db.relationship('ChatHistory',  backref='user',    lazy=True)

    def __repr__(self):
        return f'<User {self.id} - {self.email}>'


class CallLog(db.Model):
    __tablename__ = 'call_log'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    peer_id    = db.Column(db.String(100))
    duration   = db.Column(db.Integer, default=0)
    transcript = db.Column(db.Text, default='')
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __init__(self, user_id, peer_id=None, duration=0, transcript=''):
        self.user_id = user_id
        self.peer_id = peer_id
        self.duration = duration
        self.transcript = transcript

    def __repr__(self):
        return f'<CallLog {self.id} - User {self.user_id}>'


class CallSession(db.Model):
    __tablename__ = 'call_session'

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    contact_name = db.Column(db.String(120), nullable=True)
    session_id   = db.Column(db.String(80), unique=True, nullable=False, default=lambda: uuid.uuid4().hex)
    language     = db.Column(db.String(40), nullable=True)
    feature_used = db.Column(db.String(50), nullable=True) # Added feature_used
    started_at   = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    ended_at     = db.Column(db.DateTime, nullable=True)
    duration     = db.Column(db.Integer, default=0)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, user_id, contact_name=None, session_id=None, language='en-IN', feature_used=None, started_at=None, ended_at=None, duration=0):
        self.user_id = user_id
        self.contact_name = contact_name
        self.session_id = session_id or uuid.uuid4().hex
        self.language = language
        self.feature_used = feature_used
        self.started_at = started_at or datetime.utcnow()
        self.ended_at = ended_at
        self.duration = duration

    # Relationships
    captions     = db.relationship('CallCaption', backref='session', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<CallSession {self.session_id}>'


class CallCaption(db.Model):
    __tablename__ = 'call_caption'

    id              = db.Column(db.Integer, primary_key=True)
    call_session_id = db.Column(db.Integer, db.ForeignKey('call_session.id'), nullable=False)
    speaker         = db.Column(db.String(40), nullable=True)
    caption_text    = db.Column(db.Text, nullable=False)
    timestamp       = db.Column(db.DateTime, nullable=True)
    sequence_number = db.Column(db.Integer, nullable=False, default=1)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, call_session_id, speaker=None, caption_text='', timestamp=None, sequence_number=1):
        self.call_session_id = call_session_id
        self.speaker = speaker
        self.caption_text = caption_text
        self.timestamp = timestamp or datetime.utcnow()
        self.sequence_number = sequence_number

    def __repr__(self):
        return f'<CallCaption {self.id} - Session {self.call_session_id}>'


class Report(db.Model):
    __tablename__ = 'report'

    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    name        = db.Column(db.String(80))
    email       = db.Column(db.String(120)) # Added email
    report_type = db.Column('type', db.String(50))
    message     = db.Column(db.Text, nullable=False)
    status      = db.Column(db.String(20), default='Pending') # Added status
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, name=None, email=None, report_type=None, message=None, user_id=None, status='Pending'):
        self.name = name
        self.email = email
        self.report_type = report_type
        self.message = message
        self.user_id = user_id
        self.status = status

    def __repr__(self):
        return f'<Report {self.id} - {self.report_type}>'


class ChatHistory(db.Model):
    __tablename__ = 'chat_history'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    role       = db.Column(db.String(10), nullable=False)
    message    = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def __init__(self, user_id: int, role: str, message: str):
        self.user_id = user_id
        self.role    = role
        self.message = message

    def __repr__(self):
        return f'<ChatHistory {self.id} - User {self.user_id} - {self.role}>'