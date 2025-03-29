from rest_framework import authentication
from rest_framework import exceptions
from firebase_admin import auth
from django.contrib.auth import get_user_model
import firebase_admin
from django.db import transaction

User = get_user_model()

class FirebaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return None

        try:
            id_token = auth_header.split(' ').pop()
            
            try:
                decoded_token = auth.verify_id_token(id_token)
            except (firebase_admin.exceptions.FirebaseError, ValueError) as e:
                raise exceptions.AuthenticationFailed(f'Invalid token: {str(e)}')

            uid = decoded_token['uid']
            
            # For registration endpoint, don't require existing user
            if request.path.endswith('/api/users/register/'):
                return (None, None)
                
            try:
                user = User.objects.get(firebase_uid=uid)
                return (user, None)
            except User.DoesNotExist:
                raise exceptions.AuthenticationFailed('No such user exists')
                
        except Exception as e:
            raise exceptions.AuthenticationFailed(str(e))

    def authenticate_header(self, request):
        return 'Bearer' 