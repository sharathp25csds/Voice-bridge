import sqlite3
import os

db_path = 'backend/instance/voicebridge.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

print(f"Database: {db_path}")
for table in tables:
    name = table[0]
    cursor.execute(f"SELECT count(*) FROM {name}")
    count = cursor.fetchone()[0]
    print(f"Table: {name}, Count: {count}")

conn.close()
