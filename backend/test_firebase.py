from config.firebase_config import db

def test_firebase_connection():
    try:
        # Try to access a collection
        docs = db.collection('jobs_listings').limit(1).stream()
        list(docs)  # Try to read the documents
        print("✅ Successfully connected to Firebase")
        return True
    except Exception as e:
        print(f"❌ Failed to connect to Firebase: {e}")
        return False

if __name__ == "__main__":
    test_firebase_connection() 