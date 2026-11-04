import sqlite3

TARGET_ID = "cam-org-metro-police-0"
NEW_STREAM_ID = "5916b462-06cf-4699-bc2a-2025b631ddb3"

conn = sqlite3.connect("test.db")
conn.row_factory = sqlite3.Row

cur = conn.cursor()
cur.execute(
    "UPDATE camera SET camera_stream_id=? WHERE id=?",
    (NEW_STREAM_ID, TARGET_ID)
)
conn.commit()

if cur.rowcount == 0:
    print(f"WARNING: No camera found with id='{TARGET_ID}'")
else:
    row = conn.execute(
        "SELECT id, name, camera_stream_id FROM camera WHERE id=?",
        (TARGET_ID,)
    ).fetchone()
    print(f"Updated successfully:")
    print(f"  id              : {row['id']}")
    print(f"  name            : {row['name']}")
    print(f"  camera_stream_id: {row['camera_stream_id']}")

conn.close()
