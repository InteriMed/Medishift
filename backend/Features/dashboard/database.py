from config.firebase_config import db

def get_db():
    """Get Firestore database instance"""
    return db

def add_document(collection, data, doc_id=None):
    """Add a document to Firestore collection"""
    db = get_db()
    if doc_id:
        return db.collection(collection).document(doc_id).set(data)
    else:
        return db.collection(collection).add(data)

def get_document(collection, doc_id):
    """Get a document from Firestore collection"""
    db = get_db()
    doc_ref = db.collection(collection).document(doc_id)
    doc = doc_ref.get()
    return doc.to_dict() if doc.exists else None

def update_document(collection, doc_id, data):
    """Update a document in Firestore collection"""
    db = get_db()
    return db.collection(collection).document(doc_id).update(data)

def delete_document(collection, doc_id):
    """Delete a document from Firestore collection"""
    db = get_db()
    return db.collection(collection).document(doc_id).delete()

def get_collection(collection):
    """Get all documents from a collection"""
    db = get_db()
    docs = db.collection(collection).stream()
    return [doc.to_dict() for doc in docs]