from app.services.face_service import get_largest_face_embedding
import sys

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_insightface_service.py <image_path>")
        return
        
    image_path = sys.argv[1]
    print(f"Testing embedding for {image_path}...")
    
    embedding = get_largest_face_embedding(image_path)
    if embedding is not None:
        print(f"Success! Extracted embedding of size {len(embedding)}")
        print(f"First 5 elements: {embedding[:5]}")
    else:
        print("Failed to extract embedding or no face detected.")

if __name__ == "__main__":
    main()
