"""Final verification: simulate what the backend queries will do"""
import sqlite3, os, json

db_path = 'backend/instance/voicebridge.db'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("=== 1. Stats ===")
for table in ['user', 'call_session', 'chat_history', 'report']:
    cursor.execute(f"SELECT count(*) FROM {table}")
    print(f"  {table}: {cursor.fetchone()[0]}")

print("\n=== 2. Users ===")
cursor.execute("SELECT id, name, email, created_at FROM user ORDER BY created_at DESC LIMIT 2")
for row in cursor.fetchall():
    print(f"  {dict(row)}")

print("\n=== 3. Reports ===")
cursor.execute("SELECT id, user_id, name, email, type, message, status, created_at FROM report ORDER BY created_at DESC LIMIT 2")
for row in cursor.fetchall():
    print(f"  {dict(row)}")

print("\n=== 4. Call Sessions (Transcripts) ===")
cursor.execute("SELECT cs.user_id, u.name as user_name, cs.duration, cs.started_at, cs.ended_at, cs.feature_used, cs.created_at FROM call_session cs LEFT JOIN user u ON cs.user_id = u.id LIMIT 2")
for row in cursor.fetchall():
    print(f"  {dict(row)}")

print("\n=== 5. Chats ===")
cursor.execute("SELECT id, user_id, role, message, created_at FROM chat_history LIMIT 2")
for row in cursor.fetchall():
    print(f"  {dict(row)}")

conn.close()
print("\nAll queries executed successfully!")
