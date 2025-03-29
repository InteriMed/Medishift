from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from .serializers import UserSerializer, UserRegistrationSerializer
import firebase_admin
from firebase_admin import auth
from django.conf import settings
from .services import UserService
from rest_framework.views import APIView
from firebase_admin.auth import InvalidIdTokenError, ExpiredIdTokenError, RevokedIdTokenError
from django.http import JsonResponse
from firebase_admin import firestore

User = get_user_model()

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    try:
        # Get Firebase ID token from request
        id_token = request.data.get('id_token')
        
        if not id_token:
            return Response({
                'error': 'Firebase ID token is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verify the Firebase token
        try:
            decoded_token = auth.verify_id_token(id_token)
            firebase_uid = decoded_token['uid']
            
            # Get user from database
            try:
                user = User.objects.get(firebase_uid=firebase_uid)
                return Response({
                    'user': UserSerializer(user).data
                })
            except User.DoesNotExist:
                return Response({
                    'error': 'User not found in database'
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            return Response({
                'error': 'Invalid Firebase token'
            }, status=status.HTTP_401_UNAUTHORIZED)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    try:
        # Get and validate Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        print(f"Received auth header: {auth_header[:20]}...")
        
        if not auth_header:
            return Response(
                {'error': 'No authorization header provided'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        if not auth_header.startswith('Bearer '):
            return Response(
                {'error': 'Invalid authorization header format'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        token = auth_header.split(' ')[1]
        print(f"Extracted token: {token[:20]}...")
        
        try:
            # Verify the token
            decoded_token = auth.verify_id_token(token)
            firebase_uid = decoded_token['uid']
            print(f"Successfully decoded token for UID: {firebase_uid}")
            
            # Check if user already exists
            if User.objects.filter(firebase_uid=firebase_uid).exists():
                return Response(
                    {'error': 'User already exists'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get and validate request data
            request_data = request.data
            print(f"Received request data: {request_data}")
            
            # Create user
            serializer = UserRegistrationSerializer(data=request_data)
            if serializer.is_valid():
                user = serializer.save()
                print(f"Successfully created user with ID: {user.id}")
                return Response({
                    'message': 'User created successfully',
                    'user': UserSerializer(user).data
                }, status=status.HTTP_201_CREATED)
            
            print(f"Serializer errors: {serializer.errors}")
            # Return the first error message for each field
            error_messages = {
                field: errors[0] for field, errors in serializer.errors.items()
            }
            return Response(error_messages, status=status.HTTP_400_BAD_REQUEST)

        except auth.InvalidIdTokenError as e:
            print(f"Invalid token error: {str(e)}")
            return Response(
                {'error': f'Invalid token: {str(e)}'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            print(f"Token verification error: {str(e)}")
            return Response(
                {'error': f'Token verification failed: {str(e)}'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
                          
    except Exception as e:
        print(f"General error in register view: {str(e)}")
        return Response(
            {'error': f'Registration failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def validate_token(request):
    try:
        # Get and verify Firebase token
        id_token = request.data.get('id_token')
        if not id_token:
            return Response({'error': 'Firebase ID token required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
            
        try:
            decoded_token = auth.verify_id_token(id_token)
            firebase_uid = decoded_token['uid']
            
            # Check if user exists
            try:
                user = User.objects.get(firebase_uid=firebase_uid)
                return Response({
                    'exists': True,
                    'user': UserSerializer(user).data
                })
            except User.DoesNotExist:
                return Response({
                    'exists': False,
                    'firebase_uid': firebase_uid
                })
                
        except auth.InvalidIdTokenError:
            return Response({'error': 'Invalid Firebase token'}, 
                          status=status.HTTP_401_UNAUTHORIZED)
            
    except Exception as e:
        return Response({'error': str(e)}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def check_user_exists(request):
    try:
        email = request.data.get('email')
        if not email:
            return Response(
                {'error': 'Email is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        exists = User.objects.filter(email=email).exists()
        return Response({'exists': exists})
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def check_email_exists(request):
    email = request.data.get('email')
    
    if not email:
        return Response({'error': 'Email is required'}, status=400)
        
    try:
        # Check if email exists in Firebase
        try:
            user = auth.get_user_by_email(email)
            return Response({'exists': True, 'message': 'Email already in use'}, status=200)
        except auth.UserNotFoundError:
            pass
            
        # Check if email exists in Django database
        if User.objects.filter(email=email).exists():
            return Response({'exists': True, 'message': 'Email already in use'}, status=200)
            
        return Response({'exists': False}, status=200)
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_by_id(request, user_id):
    try:
        db = firestore.client()
        user_doc = db.collection('users').document(user_id).get()
        
        if not user_doc.exists:
            return JsonResponse(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        user_data = user_doc.to_dict()
        return JsonResponse(user_data)
        
    except Exception as e:
        return JsonResponse(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
