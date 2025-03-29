from database import add_document, get_document, update_document
from django.conf import settings

class UserService:
    @staticmethod
    def create_user_in_firebase(user):
        user_data = {
            "profession": user.category,
            "account_type": user.user_type,
            "name": user.name,
            "surname": user.surname,
            "birthdate": str(user.birthdate) if user.birthdate else None,
            "email": user.email,
            "phone_number": user.phone_number,
            "address": user.address,
            "gender": user.gender,
            "experience_years": user.experience_years,
            "summary": user.summary,
            "profile_details": user.profile_details,
            "cv_url": user.cv_url,
            "cover_letter_url": user.cover_letter_url,
            "software_experience": user.software_experience
        }
        
        return add_document("users", user.firebase_uid, user_data)

    @staticmethod
    def get_user_from_firebase(firebase_uid):
        return get_document("users", firebase_uid)

    @staticmethod
    def update_user_in_firebase(user):
        user_data = {
            "name": user.name,
            "surname": user.surname,
            # Add other fields as needed
        }
        return update_document("users", user.firebase_uid, user_data) 