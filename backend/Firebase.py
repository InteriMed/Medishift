import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from datetime import datetime
from database import (
    add_document, get_document, 
    update_document, delete_document,
)
import random

import random
import string
from datetime import datetime

# Initialize Firestore client globally
db = None

def initialize_firebase():
    global db
    if not firebase_admin._apps:
        cred_path = os.path.join('/Users/williamabhamon/Code/PharmaSoftOnline/pharmacy-replacement-platform/pharmacy-replacement-platform/backend/config/firebase-credentials.json')
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
    return db

# User Management Functions
def create_db_collection(collection_name):
    try:
        initialize_firebase()
        db = firestore.client()
        
        # Reference the collection
        test_collection = db.collection(collection_name)
        
        # Add a document with some test data
        # test_doc = test_collection.document('test_document')
        # test_doc.set({
        #     'test_message': 'Hello Firebase!',
        #     'timestamp': datetime.now().isoformat()
        # })
        
        print(f"✅ Successfully created collection '{collection_name}' and added a test document.")
        return True
    except Exception as e:
        print(f"❌ Failed to create collection '{collection_name}': {str(e)}")
        return False

def print_db_collections():
    try:
        initialize_firebase()
        db = firestore.client()
        
        # Get all collections
        collections = db.collections()
        print("📂 Firestore Collections:")
        for collection in collections:
            print(f"- {collection.id}")
    except Exception as e:
        print(f"❌ Failed to retrieve collections: {str(e)}")

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


#_________________________________________________________________________________________

# Collections Management Functions
def manage_user_document(uid, user_data, is_create=False):
    """
    Unified function to create or update user documents
    """
    try:
        data = {**user_data}
        if is_create:
            data['createdAt'] = firestore.SERVER_TIMESTAMP
            return add_document('users', uid, data)
        else:
            data['updatedAt'] = firestore.SERVER_TIMESTAMP
            return update_document('users', uid, data)
    except Exception as e:
        action = "create" if is_create else "update"
        print(f"❌ Failed to {action} user document: {str(e)}")
        return False

def set_user_availability(uid, availability_list):
    try:
        data = {
            'uid': uid,
            'availability': availability_list,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        return add_document('availabilities', uid, data)
    except Exception as e:
        print(f"❌ Failed to set availability: {str(e)}")
        return False

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

#_________________________________________________________________________________________

# User Profile Functions
def update_user_skills(uid, skills):
    try:
        initialize_firebase()
        db = firestore.client()
        
        user_ref = db.collection('users').document(uid)
        user_ref.update({
            'skills': skills,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        print(f"✅ Successfully updated skills for {uid}")
        return True
    except Exception as e:
        print(f"❌ Failed to update skills: {str(e)}")
        return False

def update_user_rating(uid, new_rating):
    try:
        initialize_firebase()
        db = firestore.client()
        
        user_ref = db.collection('users').document(uid)
        user_ref.update({
            'rating': new_rating,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        print(f"✅ Successfully updated rating for {uid}")
        return True
    except Exception as e:
        print(f"❌ Failed to update rating: {str(e)}")
        return False

#_________________________________________________________________________________________

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

# Chat Management Functions
def create_chat(worker_id, employer_id):
    try:
        chat_id = f"{worker_id}_{employer_id}"
        chat_data = {
            'chatId': chat_id,
            'users': [worker_id, employer_id],
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        return add_document('chats', chat_id, chat_data)
    except Exception as e:
        print(f"❌ Failed to create chat: {str(e)}")
        return None

def send_message(chat_id, sender_id, receiver_id, message):
    try:
        # Use batch write for atomic operations
        message_id = f"msg_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        operations = [
            {
                'collection': 'messages',
                'doc_id': f"{chat_id}/messages/{message_id}",
                'type': 'set',
                'data': {
                    'messageId': message_id,
                    'senderId': sender_id,
                    'receiverId': receiver_id,
                    'message': message,
                    'timestamp': firestore.SERVER_TIMESTAMP
                }
            },
            {
                'collection': 'chats',
                'doc_id': chat_id,
                'type': 'update',
                'data': {
                    'lastMessage': message,
                    'lastMessageAt': firestore.SERVER_TIMESTAMP
                }
            }
        ]
        
        if batch_write(operations):
            return message_id
        return None
    except Exception as e:
        print(f"❌ Failed to send message: {str(e)}")
        return None

#_________________________________________________________________________________________

# Contract Management Functions
def create_contract(worker_id, employer_id, job_id, contract_url):
    try:
        initialize_firebase()
        db = firestore.client()
        
        contract_ref = db.collection('contracts').document()
        contract_data = {
            'contractId': contract_ref.id,
            'workerId': worker_id,
            'employerId': employer_id,
            'jobId': job_id,
            'status': 'pending',
            'contractFileURL': contract_url,
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        contract_ref.set(contract_data)
        print(f"✅ Successfully created contract {contract_ref.id}")
        return contract_ref.id
    except Exception as e:
        print(f"❌ Failed to create contract: {str(e)}")
        return None

def update_contract_status(contract_id, new_status):
    try:
        initialize_firebase()
        db = firestore.client()
        
        contract_ref = db.collection('contracts').document(contract_id)
        contract_ref.update({
            'status': new_status,
            'signedAt': firestore.SERVER_TIMESTAMP if new_status == 'signed' else None
        })
        print(f"✅ Successfully updated contract status to {new_status}")
        return True
    except Exception as e:
        print(f"❌ Failed to update contract status: {str(e)}")
        return False

#_________________________________________________________________________________________

# Settings Management Functions
def update_user_settings(uid, settings_data, collection='settings'):
    """
    Universal settings update function that can handle both user settings and profile updates
    """
    try:
        initialize_firebase()
        db = firestore.client()
        
        doc_ref = db.collection(collection).document(uid)
        settings_data['updatedAt'] = firestore.SERVER_TIMESTAMP
        doc_ref.set(settings_data, merge=True)
        print(f"✅ Successfully updated {collection} for {uid}")
        return True
    except Exception as e:
        print(f"❌ Failed to update {collection}: {str(e)}")
        return False

def create_user_profile(user_id, phone, address, email, website, birthday, gender, summary_profile, experiences, studies, picture_url, contracts):
    try:
        # Initialize Firestore
        db = firestore.Client()

        # Reference the users collection
        users_collection = db.collection('users')

        # Add a document for the user
        user_doc = users_collection.document(user_id)
        user_doc.set({
            'phone': phone,
            'address': address,
            'email': email,
            'website': website,
            'birthday': birthday,
            'gender': gender,
            'summary_profile': summary_profile,
            'experiences': experiences,  # This should be a list of dictionaries
            'experience': experience,
            'studies': studies,          # This should be a list of dictionaries
            'picture_url': picture_url,
            'contracts': contracts,      # This should be a list of contract identifiers or URLs
            'created_at': datetime.now().isoformat()
        })

        print(f"✅ Successfully created user profile for user ID '{user_id}'.")
        return True
    except Exception as e:
        print(f"❌ Failed to create user profile for user ID '{user_id}': {str(e)}")
        return False

def add_job_listings(job_listings):
    """
    Function to add multiple job listings to Firestore.
    :param job_listings: List of dictionaries containing job details.
    """
    try:
        # Initialize Firebase and get db client
        db = initialize_firebase()
        
        job_collection = db.collection('jobs_listings')
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

# Function to add mock users to Firestore
def add_mock_users_to_firestore(num_users=3):
    try:
        uid = ['ZgSMcv5jd9Mhjo4A68ZZK0Puabw2', 'WmzTJe0b9vcpcxXLZ4lCzUELzdn2', 'o2zampe0aua8xmvZU4R3Qw6pocI3']

        # Initialize Firebase and get db client
        db = initialize_firebase()
        
        users_collection = db.collection('users')
        
        for user_id in range(0, 3):
            user_data = generate_mock_user_data(user_id, uid)
            user_doc = users_collection.document(uid[user_id])
            user_doc.set(user_data)
        
        print(f"✅ Successfully added {num_users} mock users.")
        return True
    except Exception as e:
        print(f"❌ Failed to add mock users: {str(e)}")
        return False

# Helper function to generate mock user data
def generate_mock_user_data(user_id, uid):
    languages = {
        "English": "Advanced",
        "French": "Intermediate",
        "German": "Basic",
        "Spanish": "Working proficiency"
    }

    experiences = [
        {"job_title": "Pharmacist", "company": "Pharmacy A", "start_date": "2020-01-01", "end_date": "2022-01-01", "details": "Managed inventory and customer consultations."},
        {"job_title": "Pharmacy Technician", "company": "Pharmacy B", "start_date": "2018-01-01", "end_date": "2020-01-01", "details": "Assisted with prescriptions and customer service."},
    ]
    
    studies = [
        {"degree": "Bachelor of Pharmacy", "institution": "University B", "graduation_year": 2019, "details": "Focused on pharmaceutical chemistry."},
        {"degree": "Master of Pharmacy", "institution": "University C", "graduation_year": 2021, "details": "Specialized in clinical pharmacy."},
    ]
    
    volunteerings = [
        {"role": "Volunteer Pharmacist", "organization": "Pharmacy Charity", "start_date": "2021-01-01", "end_date": "2021-06-01", "details": "Provided free consultations and medication to low-income patients."},
    ]
    
    reviews = [
        {"stars": 5, "comment": "Excellent work!", "author": "Pharmacy A", "date": "2023-01-01"},
        {"stars": 4, "comment": "Good experience, but could improve on speed.", "author": "Pharmacy B", "date": "2023-01-10"},
    ]
    
    contracts = [
        {"contract_id": "C123", "contract_url": "https://example.com/contract1"},
        {"contract_id": "C456", "contract_url": "https://example.com/contract2"},
    ]
    
    skills = ["Pharmaceutical Chemistry", "Customer Service", "Inventory Management", "Medication Dispensing"]

    return {
        'uid': f"{uid}",
        'phone': f"+41 79 123 45 {random.randint(10, 99)}",  # Swiss phone number format
        'address': "Zurich, Switzerland",
        'email': f"user{user_id}@pharma.com",
        'website': f"https://www.pharmaco{user_id}.com",
        'birthday': "1990-05-12",
        'gender': random.choice(["Male", "Female", "Other"]),
        'languages': languages,
        'summary_profile': "Experienced pharmacist with expertise in clinical and community pharmacy.",
        'experiences': experiences,
        'studies': studies,
        'volunteering': volunteerings,
        'picture_url': "https://example.com/pic.jpg",
        'reviews': reviews,
        'contracts': contracts,
        'skills': skills,
        'created_at': datetime.now().isoformat()
    }


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

# Helper function to generate random string for mock data (for message content, conversation ID, etc.)
def random_string(length=10):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

# Helper function to generate mock message data
def generate_mock_message_data(conversation_id, sender_id, recipient_id):
    message_types = ["text", "image", "video"]
    message_type = random.choice(message_types)
    
    message_content = {
        "text": f"This is a mock message from {sender_id} to {recipient_id}",
        "image": f"https://example.com/image/{random_string(10)}.jpg",
        "video": f"https://example.com/video/{random_string(10)}.mp4"
    }
    
    return {
        'conversation_id': conversation_id,
        'sender_id': sender_id,
        'recipient_id': recipient_id,
        'message': message_content[message_type],
        'message_type': message_type,
        'timestamp': datetime.now().isoformat(),
        'seen': False  # Initially, messages can be unread
    }

# Helper function to generate mock message thread data
def generate_mock_message_thread_data(user_ids):
    conversation_id = random_string(20)  # Unique ID for the conversation
    participants = random.sample(user_ids, random.randint(2, len(user_ids)))  # Select random participants for the conversation
    
    # Assume the last message is the most recent one in the conversation
    last_message = generate_mock_message_data(conversation_id, participants[-1], participants[0])
    
    return {
        'conversation_id': conversation_id,
        'participants': participants,
        'last_message': last_message['timestamp'],
    }



# Function to generate a set of mock messages for a user and directly insert them into Firestore
def create_mock_conversation_data_in_db(user_ids, num_messages_per_conversation=5):
    try:
        initialize_firebase()
        db = firestore.client()
        
        # Create a few conversations
        for _ in range(random.randint(1, 3)):
            # Generate conversation ID
            conversation_id = random_string(20)
            
            # Select random participants (always at least 2)
            num_participants = random.randint(2, len(user_ids))
            participants = random.sample(user_ids, num_participants)
            
            # Create message thread document
            thread_ref = db.collection('message_threads').document(conversation_id)
            thread_ref.set({
                'participants': participants,
                'last_message': firestore.SERVER_TIMESTAMP
            })
            
            # Generate messages for this conversation
            for _ in range(num_messages_per_conversation):
                sender, recipient = random.sample(participants, 2)
                
                # Create message document with exactly the specified fields
                message_data = {
                    'sender_id': sender,
                    'recipient_id': recipient,
                    'timestamp': firestore.SERVER_TIMESTAMP,
                    'message': f"This is a mock message from {sender} to {recipient}",
                    'message_type': random.choice(['text', 'image', 'video']),
                    'seen': random.choice([True, False])
                }
                
                # Add message directly to messages collection
                db.collection('messages').document(conversation_id).set(message_data)
                
                # Update the last_message timestamp in the thread
                thread_ref.update({
                    'last_message': firestore.SERVER_TIMESTAMP
                })
        
        print("✅ Mock conversation data created successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to create mock conversation data: {str(e)}")
        return False


# Main program
if __name__ == "__main__":
    # Example usage with actual user IDs
    user_ids = ['ZgSMcv5jd9Mhjo4A68ZZK0Puabw2', 'WmzTJe0b9vcpcxXLZ4lCzUELzdn2', 'o2zampe0aua8xmvZU4R3Qw6pocI3']
    create_mock_conversation_data_in_db(user_ids, num_messages_per_conversation=5)
