# PharmaSoft Project

PharmaSoft is a comprehensive pharmacy management solution built with React and Firebase.

## Quick Start

1. Clone the repository
   ```bash
   git clone https://github.com/your-username/pharmasoft.git
   cd pharmasoft
   ```

2. Install dependencies
   ```bash
   npm install
   cd frontend && npm install
   cd functions && npm install
   ```

3. Set up environment variables
   - Copy `frontend/.env.example` to `frontend/.env` and fill in values
   - Copy `functions/.env.example` to `functions/.env` and fill in values

4. Start the development server
   ```bash
   # Start Firebase emulators
   firebase emulators:start
   
   # In another terminal, start the frontend
   cd frontend && npm start
   ```

5. Access the application at http://localhost:3000

## Documentation

For more detailed information about the project, please refer to the [documentation](./docs):

- [Git Workflow](./docs/git-workflow.md)
- [Code Standards](./docs/code-standards.md)
- [Testing Strategy](./docs/testing-strategy.md)

## Key Features

- User authentication and role-based access control
- Dashboard for pharmacists
- Calendar and appointment management
- Real-time messaging
- Profile management
- Internationalization support (multiple languages)

## Technology Stack

- Frontend: React, React Router
- Backend: Firebase (Authentication, Firestore, Storage, Functions)
- CI/CD: GitHub Actions
- Testing: Jest, React Testing Library

## Contributing

1. Ensure you've read the [Git Workflow](./docs/git-workflow.md) document
2. Create a feature branch from `develop`
3. Make your changes, following our [Code Standards](./docs/code-standards.md)
4. Submit a pull request to `develop`

## License

[MIT](./LICENSE) 