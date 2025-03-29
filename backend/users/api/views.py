from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .exceptions import AuthenticationError, ValidationError
from .services import AuthService

# Group related endpoints
class AuthViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'])
    def login(self, request):
        try:
            result = AuthService.login(request.data)
            return Response(result)
        except AuthenticationError as e:
            return Response({'error': str(e)}, status=401)
        except ValidationError as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=False, methods=['post'])
    def register(self, request):
        # Register logic

class ProfileViewSet(viewsets.ModelViewSet):
    # Profile CRUD operations 