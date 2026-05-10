from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid

db = SQLAlchemy()

class User(db.Model):
    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(80), nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    call_logs     = db.relationship('CallLog', backref='user', lazy=True)
    reports       = db.relationship('Report', backref='user', lazy=True)

class CallLog(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    peer_id    = db.Column(db.String(100))
    duration   = db.Column(db.Integer, default=0)
    transcript = db.Column(db.Text, default='')
    started_at = db.Column(db.DateTime, default=datetime.utcnow)

class CallSession(db.Model):
    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    contact_name = db.Column(db.String(120), nullable=True)
    session_id   = db.Column(db.String(80), unique=True, nullable=False, default=lambda: uuid.uuid4().hex)
    language     = db.Column(db.String(40), nullable=True)
    started_at   = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    ended_at     = db.Column(db.DateTime, nullable=True)
    duration     = db.Column(db.Integer, default=0)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    captions     = db.relationship('CallCaption', backref='session', lazy=True, cascade='all, delete-orphan')

class CallCaption(db.Model):
    id              = db.Column(db.Integer, primary_key=True)
    call_session_id = db.Column(db.Integer, db.ForeignKey('call_session.id'), nullable=False)
    speaker         = db.Column(db.String(40), nullable=True)
    caption_text    = db.Column(db.Text, nullable=False)
    timestamp       = db.Column(db.DateTime, nullable=True)
    sequence_number = db.Column(db.Integer, nullable=False, default=1)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

class Report(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    name       = db.Column(db.String(80))
    type       = db.Column(db.String(50))
    message    = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ChatHistory(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    role       = db.Column(db.String(10), nullable=False)
    message    = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)