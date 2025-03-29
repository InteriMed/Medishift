import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from datetime import datetime
from database import (
    add_document, get_document, 
    update_document, delete_document,
)
from django.http import JsonResponse
import logging
from flask import jsonify
import json
from functools import wraps

logger = logging.getLogger(__name__)

# Initialize Firestore client globally
db = None

def initialize_firebase():
    """Initialize Firebase Admin SDK and return Firestore client"""
    global db
    try:
        if not firebase_admin._apps:
            # Use absolute path for credentials file
            cred_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config', 'firebase-credentials.json')
            if not os.path.exists(cred_path):
                raise FileNotFoundError(f"Firebase credentials file not found at {cred_path}")
            
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            
        if db is None:
            db = firestore.client()
        
        return db
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {str(e)}")
        raise

def print_db_content(collection_name):
    try:
        initialize_firebase()
        db = firestore.client()
        
        # Reference the collection
        test_collection = db.collection(collection_name)
        
        # Get all documents in the collection
        docs = test_collection.stream()
        print(f"📋 Content of collection '{collection_name}':")
        for doc in docs:
            print(f"Document ID: {doc.id} => Data: {doc.to_dict()}")
    except Exception as e:
        print(f"❌ Failed to retrieve content from collection '{collection_name}': {str(e)}")

# Authentication verification
def verify_firebase_token(request):
    """Verify Firebase ID token from request"""
    try:
        initialize_firebase()
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return None

        token = token.split('Bearer ')[1]
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Failed to verify token: {str(e)}")
        return None

# Authentication decorator for Django views
def firebase_auth_required(view_func):
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        decoded_token = verify_firebase_token(request)
        if not decoded_token:
            return JsonResponse({'error': 'Authentication required'}, status=401)
        
        # Add user info to request
        request.firebase_user_id = decoded_token.get('uid')
        return view_func(request, *args, **kwargs)
    return wrapped_view

# API endpoint to get user data
def get_user_data(request, uid):
    """Get user data from Firebase Auth and Firestore"""
    try:
        # Check authentication
        decoded_token = verify_firebase_token(request)
        if not decoded_token:
            return JsonResponse({'error': 'Authentication required'}, status=401)
        
        # Verify user is requesting their own data or has admin privileges
        if decoded_token.get('uid') != uid and not decoded_token.get('admin', False):
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        
        # Get user from Firebase Auth
        initialize_firebase()
        user = auth.get_user(uid)
        
        # Get additional user data from Firestore
        user_doc = get_document('users', uid)
        
        # Combine Auth and Firestore data
        user_data = {
            'uid': user.uid,
            'email': user.email,
            'displayName': user.display_name,
            'emailVerified': user.email_verified,
            'disabled': user.disabled,
            'createdAt': user.user_metadata.creation_timestamp,
        }
        
        # Add Firestore data if it exists
        if user_doc:
            user_data.update(user_doc)
        
        return JsonResponse(user_data)
    except auth.AuthError as e:
        return JsonResponse({'error': f'Authentication error: {str(e)}'}, status=401)
    except Exception as e:
        logger.error(f"Failed to get user data: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

# Test API endpoint for debugging
def test_api(request):
    """Test API endpoint that doesn't require authentication"""
    return JsonResponse({
        'status': 'success',
        'message': 'API connection working!',
        'auth_header': request.headers.get('Authorization', 'No auth header')
    })

def get_all_users():
    try:
        initialize_firebase()
        
        # Get all users (paginated by default)
        page = auth.list_users()
        users = []

        # Iterate through all users
        for user in page.iterate_all():
            user_data = {
                'uid': user.uid,
                'email': user.email,
                'display_name': user.display_name,
                'disabled': user.disabled,
                'email_verified': user.email_verified,
                'created_at': user.user_metadata.creation_timestamp,
            }
            users.append(user_data)
            
        print(f"👥 Successfully retrieved {len(users)} users")
        return users
    except Exception as e:
        print(f"❌ Failed to retrieve users: {str(e)}")
        return None

# Collections Management Functions
def get_available_workers(date):
    try:
        initialize_firebase()
        db = firestore.client()
        
        availabilities = db.collection('availabilities').stream()
        available_workers = []
        
        for avail in availabilities:
            data = avail.to_dict()
            for slot in data['availability']:
                if slot['date'] == date:
                    available_workers.append(data['uid'])
                    break
        
        return available_workers
    except Exception as e:
        print(f"❌ Failed to get available workers: {str(e)}")
        return []

def create_position(position_data):
    try:
        initialize_firebase()
        db = firestore.client()
        
        position_ref = db.collection('positions').document()
        position_data['jobId'] = position_ref.id
        position_data['createdAt'] = firestore.SERVER_TIMESTAMP
        
        position_ref.set(position_data)
        print(f"✅ Successfully created position {position_ref.id}")
        return position_ref.id
    except Exception as e:
        print(f"❌ Failed to create position: {str(e)}")
        return None

def get_positions_by_employer(employer_id):
    try:
        initialize_firebase()
        db = firestore.client()
        
        positions = db.collection('positions')\
            .where('employerId', '==', employer_id)\
            .stream()
        
        return [pos.to_dict() for pos in positions]
    except Exception as e:
        print(f"❌ Failed to get positions: {str(e)}")
        return []

def get_matching_positions(worker_availability):
    try:
        positions = get_all_documents('positions')
        matching_positions = []
        
        for pos_data in positions.values():
            for worker_slot in worker_availability:
                for position_slot in pos_data['shiftTimes']:
                    if (worker_slot['date'] == position_slot['date'] and
                        worker_slot['startTime'] <= position_slot['startTime'] and
                        worker_slot['endTime'] >= position_slot['endTime']):
                        matching_positions.append(pos_data)
                        break
                if pos_data in matching_positions:
                    break
        
        return matching_positions
    except Exception as e:
        print(f"❌ Failed to get matching positions: {str(e)}")
        return []

# Match Management Functions
def create_match(worker_id, job_id, employer_id):
    try:
        initialize_firebase()
        db = firestore.client()
        
        match_ref = db.collection('matches').document()
        match_data = {
            'matchId': match_ref.id,
            'workerId': worker_id,
            'jobId': job_id,
            'employerId': employer_id,
            'status': 'pending',
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        match_ref.set(match_data)
        print(f"✅ Successfully created match {match_ref.id}")
        return match_ref.id
    except Exception as e:
        print(f"❌ Failed to create match: {str(e)}")
        return None

def update_match_status(match_id, new_status):
    try:
        initialize_firebase()
        db = firestore.client()
        
        match_ref = db.collection('matches').document(match_id)
        match_ref.update({
            'status': new_status,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        print(f"✅ Successfully updated match status to {new_status}")
        return True
    except Exception as e:
        print(f"❌ Failed to update match status: {str(e)}")
        return False

#_________________________________________________________________________________________

def add_job_listings(job_listings):
    """
    Function to add multiple job listings to Firestore.
    :param job_listings: List of dictionaries containing job details.
    """
    try:
        # Initialize Firebase and get db client
        db = initialize_firebase()
        
        job_collection = db.collection('job_listings')
        for job in job_listings:
            job_id = job_collection.document().id  # Auto-generate ID
            job['job_id'] = job_id
            job['posted_at'] = datetime.now().isoformat()  # Add timestamp
            job_collection.document(job_id).set(job)
        
        print(f"✅ Successfully added {len(job_listings)} job listings.")
        return True
    except Exception as e:
        print(f"❌ Failed to add job listings: {str(e)}")
        return False

def add_availability_listings(availability_listings):
    """
    Function to add multiple pharmacist availability listings to Firestore.
    :param availability_listings: List of dictionaries containing availability details.
    """
    try:
        # Initialize Firebase and get db client
        db = initialize_firebase()
        
        availability_collection = db.collection('workers_listings')
        for availability in availability_listings:
            availability_id = availability_collection.document().id  # Auto-generate ID
            availability['availability_id'] = availability_id
            availability['updated_at'] = datetime.now().isoformat()  # Add timestamp
            availability_collection.document(availability_id).set(availability)
        
        print(f"✅ Successfully added {len(availability_listings)} availability listings.")
        return True
    except Exception as e:
        print(f"❌ Failed to add availability listings: {str(e)}")
        return False

# Example data to insert into Firestore

job_listings = [
    {
        "employer_id": "EMP123",
        "title": "Pharmacist Needed for Night Shift",
        "description": "Looking for a licensed pharmacist to cover the night shift.",
        "requirements": ["Valid Swiss pharmacy license", "3+ years experience"],
        "salary": 50.0,  # CHF per hour
        "location": {"address": "Bahnhofstrasse 1", "city": "Zurich", "country": "Switzerland"},
        "status": "open",
        "applicants": [],
    },
    {
        "employer_id": "EMP456",
        "title": "Temporary Pharmacist for Holiday Cover",
        "description": "Need a pharmacist to cover for a holiday period.",
        "requirements": ["Valid Swiss pharmacy license", "1+ year experience"],
        "salary": 45.0,  # CHF per hour
        "location": {"address": "Rue de la Gare 10", "city": "Geneva", "country": "Switzerland"},
        "status": "open",
        "applicants": [],
    },
]

availability_listings = [
    {
        "pharmacist_id": "PHARM123",
        "available_from": "2025-02-10",
        "available_to": "2025-02-20",
        "preferred_location": {"city": "Zurich", "country": "Switzerland"},
        "hourly_rate": 50.0,  # CHF
        "specialties": ["Hospital Pharmacy", "Community Pharmacy"],
        "verified": True
    },
    {
        "pharmacist_id": "PHARM456",
        "available_from": "2025-03-01",
        "available_to": "2025-03-15",
        "preferred_location": {"city": "Geneva", "country": "Switzerland"},
        "hourly_rate": 48.0,  # CHF
        "specialties": ["Oncology", "Pediatrics"],
        "verified": False
    },
]

def get_listings_route(listing_type):
    try:
        # Mock data for now - replace with actual Firestore queries later
        mock_listings = {
            'jobs': [
                {
                    'id': '1',
                    'title': 'Pharmacy Assistant',
                    'location': 'Zurich',
                    'type': 'Full-time',
                    'description': 'Looking for experienced pharmacy assistant'
                }
            ],
            'workers': [
                {
                    'id': '1',
                    'name': 'John Doe',
                    'role': 'Pharmacist',
                    'experience': '5 years',
                    'location': 'Geneva'
                }
            ]
        }
        
        return jsonify(mock_listings.get(listing_type, []))
    except Exception as e:
        print(f"Error in get_listings_route: {e}")
        return jsonify({'error': str(e)}), 500

# Remove the Flask-specific code since we're using Django
def get_listings(listing_type):
    if listing_type not in ['jobs', 'workers']:
        return JsonResponse({'error': 'Invalid listing type'}, status=400)
    return get_listings_route(listing_type)

# Main program for testing
if __name__ == "__main__":
    try:
        db = initialize_firebase()
        collection_name = 'workers_listings'
        print_db_content(collection_name)
    except Exception as e:
        print(f"❌ Error: {str(e)}")
