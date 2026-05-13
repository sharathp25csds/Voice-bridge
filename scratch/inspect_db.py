"""Inspect full database schema and sample data"""
import sqlite3, os

db_path = 'backend/instance/voicebridge.db'
if not os.path.exists(db_path):
    print(f"ERROR: DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# List all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [r[0] for r in cursor.fetchall()]
print(f"=== Tables: {tables} ===\n")

for table in tables:
    cursor.execute(f"PRAGMA table_info({table})")
    cols = cursor.fetchall()
    print(f"--- {table} ---")
    for col in cols:
        print(f"  col_id={col[0]}, name='{col[1]}', type='{col[2]}', notnull={col[3]}, default={col[4]}, pk={col[5]}")
    
    cursor.execute(f"SELECT count(*) FROM {table}")
    count = cursor.fetchone()[0]
    print(f"  Row count: {count}")
    
    if count > 0 and table in ('report', 'user', 'call_session'):
        cursor.execute(f"SELECT * FROM {table} LIMIT 1")
        sample = cursor.fetchone()
        col_names = [c[1] for c in cols]
        print(f"  Sample: {dict(zip(col_names, sample))}")
    print()

conn.close()
