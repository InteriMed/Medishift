from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'name', 'surname', 'user_type', 
                 'company', 'category', 'firebase_uid')
        read_only_fields = ('id', 'firebase_uid')

class UserRegistrationSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        max_length=150,
        validators=[
            RegexValidator(
                regex='^[a-zA-Z0-9._-]+$',
                message='Username can only contain letters, numbers, dots, underscores and hyphens'
            )
        ]
    )
    
    class Meta:
        model = User
        fields = ('username', 'email', 'name', 'surname', 'user_type', 
                 'company', 'category', 'firebase_uid')
        
    def validate_username(self, value):
        # Check if username already exists
        if User.objects.filter(username=value).exists():
            # If exists, append a number to make it unique
            base_username = value
            counter = 1
            while User.objects.filter(username=value).exists():
                value = f"{base_username}{counter}"
                counter += 1
        return value
        
    def create(self, validated_data):
        # Create user with validated data
        user = User.objects.create_user(**validated_data)
        return user
