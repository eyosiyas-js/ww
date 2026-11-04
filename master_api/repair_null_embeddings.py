import os
from app.db.session import SessionLocal
from app.models.operational import Detection
from app.services.face_service import get_largest_face_embedding

def main():
    db = SessionLocal()
    dets = db.query(Detection).filter(Detection.face_embedding == None).all()
    count = 0
    for d in dets:
        if d.image_urls and len(d.image_urls) > 0:
            local_path = d.image_urls[0].lstrip("/")
            if os.path.exists(local_path):
                print(f"Extracting embedding for detection {d.id} from {local_path}...")
                try:
                    embedding = get_largest_face_embedding(local_path)
                    if embedding:
                        d.face_embedding = embedding
                        count += 1
                        print(f" -> Success.")
                    else:
                        print(f" -> No face found.")
                except Exception as e:
                    print(f" -> Failed: {e}")
            else:
                print(f"File not found: {local_path} for detection {d.id}")
    
    if count > 0:
        db.commit()
        print(f"Successfully repaired {count} detections.")
    else:
        print("No detections needed repair or faces not found.")

if __name__ == "__main__":
    main()
