import re
from .dashboard import verify_firebase_token
from django.http import JsonResponse

class FirebaseAuthMiddleware:
    """Middleware to verify Firebase authentication for protected routes"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Routes that require authentication
        self.protected_paths = [
            r'^/api/dashboard/',  # All dashboard API routes
        ]
        # Routes exempted from authentication
        self.exempt_paths = [
            r'^/api/auth/',       # Auth routes
            r'^/api/public/',     # Public API routes
            r'^/api/dashboard/test',  # Test API endpoint
        ]
    
    def __call__(self, request):
        # Check if the path matches any protected paths
        path = request.path
        
        # Skip middleware for exempt paths
        for pattern in self.exempt_paths:
            if re.match(pattern, path):
                return self.get_response(request)
        
        # Check if authentication is required
        requires_auth = False
        for pattern in self.protected_paths:
            if re.match(pattern, path):
                requires_auth = True
                break
        
        if requires_auth:
            # Verify the Firebase token
            decoded_token = verify_firebase_token(request)
            if not decoded_token:
                return JsonResponse({'error': 'Authentication required'}, status=401)
            
            # Add user info to request for views to use
            request.firebase_user = decoded_token
            request.firebase_user_id = decoded_token.get('uid')
        
        # Continue to the next middleware or view
        return self.get_response(request) 