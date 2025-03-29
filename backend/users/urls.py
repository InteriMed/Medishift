from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login, name='login'),
    path('register/', views.register, name='register'),
    path('validate-token/', views.validate_token, name='validate-token'),
    path('check-exists/', views.check_user_exists, name='check-user-exists'),
    path('check-email/', views.check_email_exists, name='check-email'),
    path('users/<str:user_id>', views.get_user_by_id, name='get_user_by_id'),
    # Keep other URLs as needed
]
