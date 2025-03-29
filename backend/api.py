from flask import Flask, jsonify, request
from flask_cors import CORS
from config.firebase_config import db  # Import the initialized db instance
import firebase_admin
from firebase_admin import auth
import time

app = Flask(__name__)

# Configure CORS
app.config['CORS_HEADERS'] = 'Content-Type'
CORS(app, 
    origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    supports_credentials=True
)

# Enable CORS for specific routes
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Test endpoint for API connection
@app.route('/api/test', methods=['GET'])
def test_api():
    """Test API endpoint that doesn't require authentication"""
    return jsonify({
        'status': 'success',
        'message': 'API connection working!',
        'auth_header': request.headers.get('Authorization', 'No auth header')
    })

# User data endpoint
@app.route('/api/user/<uid>', methods=['GET'])
def get_user_data(uid):
    """Get user data from Firebase Auth and Firestore"""
    try:
        # Get Authorization header
        auth_header = request.headers.get('Authorization')
        
        # If no auth header is provided, return error for protected endpoints
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        
        # Extract token
        token = auth_header.split('Bearer ')[1]
        
        try:
            # Verify token
            decoded_token = auth.verify_id_token(token)
            
            # Verify user is requesting their own data or has admin privileges
            if decoded_token.get('uid') != uid and not decoded_token.get('admin', False):
                return jsonify({'error': 'Unauthorized'}), 403
            
            # Get user from Firebase Auth
            user = auth.get_user(uid)
            
            # Get additional user data from Firestore
            user_doc = db.collection('users').document(uid).get()
            
            # Create a comprehensive user data object
            # Start with Firebase Auth data
            user_data = {
                'uid': user.uid,
                'email': user.email,
                'displayName': user.display_name or user.email.split('@')[0],
                'emailVerified': user.email_verified,
                'createdAt': user.user_metadata.creation_timestamp,
                # Add all necessary dashboard fields
                'experience': '5 years',
                'review_average': '4.8',
                'missions': '12',
                'title': 'Senior',
                'specialization': 'Pharmacist',
                'docId': uid,
                'firstName': user.display_name.split(' ')[0] if user.display_name and ' ' in user.display_name else 'Demo',
                'lastName': user.display_name.split(' ')[1] if user.display_name and ' ' in user.display_name else 'User',
                'status': 'active',
                'verified': True,
                'hourly_rate': 55,
                'languages': ['English', 'French', 'German'],
                'phone': '+41 76 123 45 67',
                'address': {
                    'street': '123 Main Street',
                    'city': 'Zurich',
                    'zip': '8001',
                    'country': 'Switzerland'
                },
                'education': [
                    {
                        'degree': 'Doctor of Pharmacy',
                        'institution': 'University of Zurich',
                        'year': '2018'
                    }
                ],
                'experience_details': [
                    {
                        'position': 'Head Pharmacist',
                        'company': 'MedCenter AG',
                        'period': '2019-Present'
                    },
                    {
                        'position': 'Pharmacist',
                        'company': 'PharmaSoft',
                        'period': '2018-2019'
                    }
                ],
                'certifications': ['Swiss Pharmacy License', 'Emergency Medicine Certification'],
                'specialties': ['Retail Pharmacy', 'Hospital Pharmacy', 'Clinical Consultation'],
                'availability': {
                    'weekdays': True,
                    'weekends': False,
                    'shifts': ['morning', 'afternoon']
                },
                'banking_validated': True
            }
            
            # Add Firestore data if it exists, overriding mock data
            if user_doc.exists:
                user_data.update(user_doc.to_dict())
                
            print(f"Returning complete user data for {uid}")
            return jsonify(user_data)
            
        except auth.AuthError as e:
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401
        except Exception as e:
            print(f"Error getting user data: {e}")
            
            # For development, provide mock data as fallback with same format
            return jsonify({
                'uid': uid,
                'displayName': 'Demo User',
                'email': 'demo@example.com',
                'review_average': '4.8',
                'experience': '5 years',
                'missions': '12',
                'title': 'Senior',
                'specialization': 'Pharmacist',
                'docId': uid,
                'firstName': 'Demo',
                'lastName': 'User',
                'status': 'active',
                'verified': True,
                'hourly_rate': 55,
                'languages': ['English', 'French', 'German'],
                'phone': '+41 76 123 45 67',
                'address': {
                    'street': '123 Main Street',
                    'city': 'Zurich',
                    'zip': '8001',
                    'country': 'Switzerland'
                },
                'education': [
                    {
                        'degree': 'Doctor of Pharmacy',
                        'institution': 'University of Zurich',
                        'year': '2018'
                    }
                ],
                'experience_details': [
                    {
                        'position': 'Head Pharmacist',
                        'company': 'MedCenter AG',
                        'period': '2019-Present'
                    },
                    {
                        'position': 'Pharmacist',
                        'company': 'PharmaSoft',
                        'period': '2018-2019'
                    }
                ],
                'certifications': ['Swiss Pharmacy License', 'Emergency Medicine Certification'],
                'specialties': ['Retail Pharmacy', 'Hospital Pharmacy', 'Clinical Consultation'],
                'availability': {
                    'weekdays': True,
                    'weekends': False,
                    'shifts': ['morning', 'afternoon']
                },
                'banking_validated': True,
                'message': f'Using mock data. Error: {str(e)}'
            })
            
    except Exception as e:
        print(f"Error in get_user_data: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/listings/<listing_type>', methods=['GET'])
def get_listings(listing_type):
    if listing_type not in ['jobs', 'workers']:
        return jsonify({'error': 'Invalid listing type'}), 400
    
    try:
        # Use the jobs_listings and workers_listings collections from dashboard.py
        collection_name = 'jobs_listings' if listing_type == 'jobs' else 'workers_listings'
        
        # Get all documents from the collection
        docs = db.collection(collection_name).stream()
        
        # Convert documents to list of dictionaries
        listings = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            listings.append(data)
        
        print(f"Retrieved {len(listings)} {listing_type} listings")
        return jsonify(listings)
        
    except Exception as e:
        print(f"Error in get_listings: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/check-email/', methods=['POST'])
def check_email():
    try:
        data = request.get_json()
        email = data.get('email')
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Query Firestore for users with the given email
        users_ref = db.collection('users')
        query = users_ref.where('email', '==', email).limit(1).get()
        
        exists = len(query) > 0
        return jsonify({'exists': exists})
    except Exception as e:
        print(f"Error in check_email: {e}")
        return jsonify({'error': str(e)}), 500

# User registration endpoint
@app.route('/api/users/register', methods=['POST'])
def register_user():
    try:
        # Get json data from request
        data = request.get_json()
        
        # Get Authorization header for verification
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        
        # Extract token
        token = auth_header.split('Bearer ')[1]
        
        try:
            # Verify token
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token.get('uid')
            
            if not uid:
                return jsonify({'error': 'Invalid authentication token'}), 401
            
            # Check if uid matches the one in the data
            if uid != data.get('firebase_uid'):
                return jsonify({'error': 'Token UID does not match provided UID'}), 403
                
            # Create/update user document in Firestore
            user_ref = db.collection('users').document(uid)
            
            # Add creation timestamp if not provided
            if 'creation_date' not in data:
                data['creation_date'] = time.time()
                
            # Set the document
            user_ref.set(data)
            
            return jsonify({
                'status': 'success',
                'message': 'User registered successfully',
                'user': {
                    'id': uid,
                    'email': data.get('email')
                }
            })
            
        except auth.AuthError as e:
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401
            
    except Exception as e:
        print(f"Error in register_user: {e}")
        return jsonify({'error': str(e)}), 500

# Create empty workers_listings document
@app.route('/api/workers/create-empty', methods=['POST'])
def create_empty_worker():
    try:
        # Get json data from request
        data = request.get_json()
        uid = data.get('uid')
        
        if not uid:
            return jsonify({'error': 'UID is required'}), 400
            
        # Get Authorization header for verification
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        
        # Extract token
        token = auth_header.split('Bearer ')[1]
        
        try:
            # Verify token
            decoded_token = auth.verify_id_token(token)
            token_uid = decoded_token.get('uid')
            
            if not token_uid or token_uid != uid:
                return jsonify({'error': 'Unauthorized'}), 403
                
            # Create empty document in workers_listings collection
            worker_ref = db.collection('workers_listings').document(uid)
            worker_ref.set({
                'uid': uid,
                'created_at': time.time(),
                'status': 'pending'
            })
            
            return jsonify({
                'status': 'success',
                'message': 'Empty worker listing created'
            })
            
        except auth.AuthError as e:
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401
            
    except Exception as e:
        print(f"Error in create_empty_worker: {e}")
        return jsonify({'error': str(e)}), 500

# Create empty messages document
@app.route('/api/messages/create-empty', methods=['POST'])
def create_empty_messages():
    try:
        # Get json data from request
        data = request.get_json()
        uid = data.get('uid')
        
        if not uid:
            return jsonify({'error': 'UID is required'}), 400
            
        # Get Authorization header for verification
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        
        # Extract token
        token = auth_header.split('Bearer ')[1]
        
        try:
            # Verify token
            decoded_token = auth.verify_id_token(token)
            token_uid = decoded_token.get('uid')
            
            if not token_uid or token_uid != uid:
                return jsonify({'error': 'Unauthorized'}), 403
                
            # Create empty document in messages collection
            messages_ref = db.collection('messages').document(uid)
            messages_ref.set({
                'uid': uid,
                'created_at': time.time(),
                'conversations': []
            })
            
            return jsonify({
                'status': 'success',
                'message': 'Empty messages document created'
            })
            
        except auth.AuthError as e:
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401
            
    except Exception as e:
        print(f"Error in create_empty_messages: {e}")
        return jsonify({'error': str(e)}), 500

# Create empty jobs document
@app.route('/api/jobs/create-empty', methods=['POST'])
def create_empty_jobs():
    try:
        # Get json data from request
        data = request.get_json()
        uid = data.get('uid')
        
        if not uid:
            return jsonify({'error': 'UID is required'}), 400
            
        # Get Authorization header for verification
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        
        # Extract token
        token = auth_header.split('Bearer ')[1]
        
        try:
            # Verify token
            decoded_token = auth.verify_id_token(token)
            token_uid = decoded_token.get('uid')
            
            if not token_uid or token_uid != uid:
                return jsonify({'error': 'Unauthorized'}), 403
                
            # Create empty document in jobs_listings collection
            jobs_ref = db.collection('jobs_listings').document(uid)
            jobs_ref.set({
                'uid': uid,
                'created_at': time.time(),
                'jobs': []
            })
            
            return jsonify({
                'status': 'success',
                'message': 'Empty jobs document created'
            })
            
        except auth.AuthError as e:
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401
            
    except Exception as e:
        print(f"Error in create_empty_jobs: {e}")
        return jsonify({'error': str(e)}), 500

# Create empty contracts document
@app.route('/api/contracts/create-empty', methods=['POST'])
def create_empty_contracts():
    try:
        # Get json data from request
        data = request.get_json()
        uid = data.get('uid')
        
        if not uid:
            return jsonify({'error': 'UID is required'}), 400
            
        # Get Authorization header for verification
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        
        # Extract token
        token = auth_header.split('Bearer ')[1]
        
        try:
            # Verify token
            decoded_token = auth.verify_id_token(token)
            token_uid = decoded_token.get('uid')
            
            if not token_uid or token_uid != uid:
                return jsonify({'error': 'Unauthorized'}), 403
                
            # Create empty document in contracts collection
            contracts_ref = db.collection('contracts').document(uid)
            contracts_ref.set({
                'uid': uid,
                'created_at': time.time(),
                'contracts': []
            })
            
            return jsonify({
                'status': 'success',
                'message': 'Empty contracts document created'
            })
            
        except auth.AuthError as e:
            return jsonify({'error': f'Authentication error: {str(e)}'}), 401
            
    except Exception as e:
        print(f"Error in create_empty_contracts: {e}")
        return jsonify({'error': str(e)}), 500

# Uncomment to add test data
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5001, debug=True) 