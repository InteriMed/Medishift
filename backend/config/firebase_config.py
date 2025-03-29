import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path
import os

def initialize_firebase():
    """Initialize Firebase Admin SDK and return Firestore client"""
    try:
        # Check if Firebase is already initialized
        if not firebase_admin._apps:
            # Get the absolute path to the credentials file
            current_dir = Path(__file__).parent
            cred_path = current_dir / 'firebase-credentials.json'
            
            if not cred_path.exists():
                raise FileNotFoundError(
                    f"Firebase credentials not found at {cred_path}"
                )
            
            print(f"Loading Firebase credentials from: {cred_path}")
            cred = credentials.Certificate(str(cred_path))
            firebase_admin.initialize_app(cred)
            print("✅ Firebase initialized successfully")
        
        return firestore.client()
    except Exception as e:
        print(f"❌ Failed to initialize Firebase: {e}")
        raise

# Initialize Firebase and get db instance
db = None
try:
    db = initialize_firebase()
except Exception as e:
    print(f"Fatal error initializing Firebase: {e}")
    raise 