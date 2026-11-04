import os
import insightface
from insightface.app import FaceAnalysis
import numpy as np

# Initialize FaceAnalysis with the buffalo_l model
# ctx_id=0 for GPU, ctx_id=-1 for CPU. 
# Using -1 (CPU) for default compatibility unless CUDA is specifically configured
_model_root = os.environ.get("INSIGHTFACE_ROOT") or (
    os.path.join(os.getcwd(), "models", "insightface")
    if os.path.exists(os.path.join(os.getcwd(), "models", "insightface"))
    else os.path.join(os.path.expanduser('~'), '.insightface')
)
_app = FaceAnalysis(name='buffalo_l', root=_model_root)
_app.prepare(ctx_id=-1, det_size=(640, 640))

def get_largest_face_embedding(img_path: str) -> bytes | None:
    """
    Reads an image from img_path, detects faces, 
    and returns the 512-dimensional embedding for the largest face found, encoded as bytes.
    """
    import cv2
    img = cv2.imread(img_path)
    if img is None:
        return None
        
    faces = _app.get(img)
    if not faces:
        return None
        
    # Get the bounding box area to find the largest face
    largest_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    
    # embedding is a numpy array (dtype=float32) of shape (512,)
    # Converting directly to bytes so it can be stored as bytea in PostgreSQL
    return largest_face.embedding.tobytes()
def get_embedding_from_b64(b64_str: str) -> bytes | None:
    """
    Decodes base64 image and returns face embedding.
    """
    import base64
    import cv2
    import numpy as np
    
    try:
        if "," in b64_str:
            b64_str = b64_str.split(",")[1]
            
        img_bytes = base64.b64decode(b64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return None
            
        faces = _app.get(img)
        if not faces:
            return None
            
        largest_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        return largest_face.embedding.tobytes()
    except Exception as e:
        import logging
        logging.error(f"Error extracting embedding from b64: {e}")
        return None
