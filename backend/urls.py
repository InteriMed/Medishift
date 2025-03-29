from django.urls import path, include

urlpatterns = [
    # ... other URL patterns ...
    path('api/', include('api.urls')),
    path('api/dashboard/', include('Features.dashboard.urls')),
] 