from django.urls import path
from . import dashboard

urlpatterns = [
    path('user/<str:uid>', dashboard.get_user_data, name='get_user_data'),
    path('test', dashboard.test_api, name='test_api'),
    # Add more dashboard-related endpoints as needed
] 