from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    name = models.CharField(max_length=255)
    surname = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    user_type = models.CharField(max_length=50)
    company = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=50, default='pharmacist')
    firebase_uid = models.CharField(max_length=128, unique=True)
    
    # New fields to match database_format.json
    birthdate = models.DateField(null=True, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    address = models.CharField(max_length=255, blank=True)
    gender = models.CharField(max_length=10, blank=True)
    experience_years = models.IntegerField(null=True, blank=True)
    summary = models.TextField(blank=True)
    profile_details = models.TextField(blank=True)
    cv_url = models.URLField(blank=True)
    cover_letter_url = models.URLField(blank=True)
    software_experience = models.JSONField(default=dict, blank=True)
    
    # Make is_temporary nullable to avoid migration issues
    is_temporary = models.BooleanField(null=True, default=False)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'name', 'surname']

    def __str__(self):
        return self.email

    class Meta:
        indexes = [
            models.Index(fields=['firebase_uid']),
        ]
