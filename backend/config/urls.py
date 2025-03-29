from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from Features.dashboard.dashboard import get_listings_route, initialize_firebase
from django.views.decorators.csrf import csrf_exempt

def welcome_view(request):
    return JsonResponse({
        "message": "Welcome to PharmaSoft API",
        "version": "1.0",
        "endpoints": {
            "admin": "/admin/",
            "api": "/api/users/"
        }
    })

@csrf_exempt
def get_listings_view(request, listing_type):
    """
    View function to handle listing requests
    """
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
        
    if listing_type not in ['jobs', 'workers']:
        return JsonResponse({'error': 'Invalid listing type'}, status=400)
    
    return get_listings_route(listing_type)

@csrf_exempt
def test_firebase(request):
    """Test Firebase connection"""
    try:
        db = initialize_firebase()
        return JsonResponse({'status': 'Firebase connection successful'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

urlpatterns = [
    path('', welcome_view, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/listings/<str:listing_type>', get_listings_view, name='get_listings'),
    path('api/test-firebase', test_firebase, name='test-firebase'),
] 