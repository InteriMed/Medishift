# Git Workflow

## Branching Strategy

We follow a simplified Git Flow approach:

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: New features (branched from develop)
- `bugfix/*`: Bug fixes (branched from develop)
- `hotfix/*`: Critical fixes for production (branched from main)
- `release/*`: Release preparation branches

## Workflow

1. Create a feature/bugfix branch from develop
   ```
   git checkout develop
   git pull
   git checkout -b feature/feature-name
   ```

2. Make changes and commit regularly with descriptive messages
   ```
   git add .
   git commit -m "feat: add user authentication UI"
   ```

3. Push changes to remote
   ```
   git push -u origin feature/feature-name
   ```

4. Create a Pull Request to develop
5. After code review and approval, merge to develop
6. Periodically create release branches from develop
7. After testing, merge release to main and tag with version

## Commit Message Format

We follow Conventional Commits specification:

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code changes that neither fix bugs nor add features
- `perf:` - Performance improvements
- `test:` - Adding or modifying tests
- `chore:` - Changes to build process or tools

Example: `feat(auth): implement password reset functionality` 