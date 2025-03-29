
_________________________________________________________________________________________________________

I should add the availability listings to the database of availabilities and the one of users so that pharmacists can check which workers are available for several dates.


backend/users/
  __init__.py
  admin.py         # Register User model
  apps.py
  models/
    __init__.py
    user.py        # User model
    profile.py     # Additional user profile fields
  api/
    __init__.py
    views.py       # API endpoints
    serializers.py # Data serialization
    urls.py        # API routing
  services/
    __init__.py
    auth.py        # Authentication logic
    profile.py     # Profile management
  middleware/
    __init__.py
    firebase.py    # Firebase authentication
  tests/
    __init__.py
    test_auth.py
    test_profile.py

## Key Changes and Improvements

1. **Configuration Management**
   - Moved all configuration to `config/` directory
   - Split settings into base/local/production
   - Centralized Firebase configuration

2. **Core Module**
   - Added `core/` for shared functionality
   - Centralized Firebase integration
   - Common middleware and utilities

3. **API Organization**
   - Restructured views into ViewSets
   - Separated serializers by function
   - Cleaner URL routing

4. **Service Layer**
   - Added services for business logic
   - Separated concerns from views
   - Improved testability

5. **Environment Management**
   - Added `.env` for environment variables
   - Split requirements by environment
   - Better security practices

## Setup Instructions

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

2. Install dependencies:
```bash
pip install -r requirements/local.txt  # For development
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

4. Run migrations:
```bash
python manage.py migrate
```

5. Start development server:
```bash
python manage.py runserver
```

## API Documentation

### Authentication Endpoints

- POST `/api/users/login/`
- POST `/api/users/register/`
- POST `/api/users/validate-token/`
- POST `/api/users/check-exists/`

### User Management Endpoints

- GET `/api/users/profile/`
- PUT `/api/users/profile/`
- PATCH `/api/users/profile/`

## Firebase Integration

The project uses Firebase for:
- Authentication
- Real-time database
- File storage

Configure Firebase credentials in:
```
config/firebase/credentials.json
```

## Testing

Run tests with:
```bash
python manage.py test
```

## Security Notes

- Keep Firebase credentials secure
- Never commit .env or credentials files
- Use environment variables for sensitive data