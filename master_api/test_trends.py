from app.db.session import SessionLocal
from app.api.v1.endpoints.admin import get_detection_trends

db = SessionLocal()
trends = get_detection_trends(db, None, 'monthly')
print('Detection trends (monthly):')
for t in trends:
    print(f'  {t["period"]}: {t["detections"]} detections')
db.close()
