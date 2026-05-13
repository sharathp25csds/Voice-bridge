"""
Safe migration: Add missing columns to the report table.
Missing: 'email' and 'status'
"""
import sqlite3, os

db_path = 'backend/instance/voicebridge.db'
if not os.path.exists(db_path):
    print(f"ERROR: Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check existing columns in report table
cursor.execute("PRAGMA table_info(report)")
columns = [row[1] for row in cursor.fetchall()]
print(f"Current report columns: {columns}")

changes = 0

if 'email' not in columns:
    print("Adding missing 'email' column to report table...")
    cursor.execute("ALTER TABLE report ADD COLUMN email VARCHAR(120)")
    conn.commit()
    print("  -> 'email' column added.")
    changes += 1
else:
    print("  'email' column already exists.")

if 'status' not in columns:
    print("Adding missing 'status' column to report table...")
    cursor.execute("ALTER TABLE report ADD COLUMN status VARCHAR(20) DEFAULT 'Pending'")
    conn.commit()
    # Set existing rows to 'Pending'
    cursor.execute("UPDATE report SET status = 'Pending' WHERE status IS NULL")
    conn.commit()
    print("  -> 'status' column added with default 'Pending'.")
    changes += 1
else:
    print("  'status' column already exists.")

# Verify final state
cursor.execute("PRAGMA table_info(report)")
final_columns = [row[1] for row in cursor.fetchall()]
print(f"\nFinal report columns: {final_columns}")

# Show sample data
cursor.execute("SELECT * FROM report LIMIT 2")
rows = cursor.fetchall()
for row in rows:
    print(f"  Sample: {dict(zip(final_columns, row))}")

conn.close()
print(f"\nDone. {changes} column(s) added.")
