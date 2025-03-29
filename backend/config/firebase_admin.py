import firebase_admin
from firebase_admin import credentials
import os
from pathlib import Path
import json

def initialize_firebase_admin():
    try:
        print("\n=== Starting Firebase Admin initialization ===")
        
        # Get the base directory
        BASE_DIR = Path(__file__).resolve().parent.parent
        cred_path = os.path.join(BASE_DIR, 'config', 'firebase-credentials.json')
        print(f"Looking for credentials at: {cred_path}")
        
        if not os.path.exists(cred_path):
            print(f"ERROR: Credentials file not found at: {cred_path}")
            raise FileNotFoundError(f"Firebase credentials file not found at {cred_path}")
        
        # Validate the credentials file
        try:
            with open(cred_path) as f:
                cred_json = json.load(f)
                required_fields = ['type', 'project_id', 'private_key', 'client_email']
                for field in required_fields:
                    if field not in cred_json:
                        raise ValueError(f"Missing required field in credentials: {field}")
                print(f"Credentials file found and validated for project: {cred_json['project_id']}")
        except json.JSONDecodeError as e:
            print("ERROR: Invalid JSON in credentials file")
            raise
        
        # Initialize Firebase Admin
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized successfully")
            return True
        else:
            print("Firebase Admin SDK already initialized")
            return True
            
    except Exception as e:
        print(f"ERROR initializing Firebase Admin SDK: {str(e)}")
        raise e