from app.db.session import SessionLocal
from app.models.operational import Detection

def main():
    db = SessionLocal()
    dets = db.query(Detection).order_by(Detection.created_at.desc()).limit(3).all()
    print("Recent detections:")
    for d in dets:
        has_emb = "YES" if d.face_embedding is not None else "NO"
        images = d.image_urls
        print(f"ID: {d.id}, image_urls: {images}, face_embedding: {has_emb}")

if __name__ == "__main__":
    main()
