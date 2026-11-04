import sqlite3

ID_A = "be68d883-3c81-44c7-8757-5bbf7b9b8ff0"
ID_B = "5916b462-06cf-4699-bc2a-2025b631ddb3"

conn = sqlite3.connect("test.db")
conn.row_factory = sqlite3.Row
cur = conn.cursor()

cols = [row[1] for row in cur.execute("PRAGMA table_info(camera)").fetchall()]
print(f"Existing columns: {cols}")

# Handle rename from stream_id -> camera_stream_id (added by a prior script)
if "stream_id" in cols and "camera_stream_id" not in cols:
    cur.execute("ALTER TABLE camera RENAME COLUMN stream_id TO camera_stream_id")
    print("Renamed 'stream_id' -> 'camera_stream_id'.")
elif "camera_stream_id" not in cols:
    cur.execute("ALTER TABLE camera ADD COLUMN camera_stream_id TEXT")
    print("Added 'camera_stream_id' column.")
else:
    print("'camera_stream_id' column already exists.")

# Fetch all cameras ordered deterministically
cameras = cur.execute("SELECT id FROM camera ORDER BY rowid").fetchall()
total = len(cameras)
print(f"Total cameras: {total}")

half = (total + 1) // 2   # first half gets the extra row if odd count

for i, row in enumerate(cameras):
    stream_id = ID_A if i < half else ID_B
    cur.execute("UPDATE camera SET camera_stream_id=? WHERE id=?", (stream_id, row["id"]))

conn.commit()

# Verify
rows = cur.execute("SELECT id, name, camera_stream_id FROM camera ORDER BY rowid").fetchall()
print(f"\n{'Name':<35} {'camera_stream_id'}")
print(f"{'-'*35} {'-'*36}")
for r in rows:
    print(f"{r['name']:<35} {r['camera_stream_id']}")

conn.close()
print(f"\nDone – first {half} cameras → ID_A, remaining {total - half} → ID_B.")
