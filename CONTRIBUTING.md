# Contributing Guide

Thank you for your interest in contributing to Epic Games Free Games Claimer! 

## Code of Conduct

Be respectful and inclusive. This project welcomes all contributors regardless of experience level.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork**: `git clone https://github.com/your-username/epic-free-games-claimer.git`
3. **Create a branch**: `git checkout -b feature/your-feature-name`
4. **Set up development environment**: See SETUP.md

## Development Workflow

### Install Dev Dependencies

```bash
npm install
npm run build
```

### Make Changes

- Keep code clean and typed (TypeScript)
- Follow existing code style
- Add tests for new features
- Update documentation if needed

### Run Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# E2E tests (requires browser)
npm run test:e2e
```

### Build and Test

```bash
# Build TypeScript
npm run build

# Test locally
npm run claim

# Or login test
npm run login
```

## Code Style

- **TypeScript** strict mode enabled
- **Prettier** for formatting
- **ESLint** for linting
- 2-space indentation
- Semicolons required

### Format Code

```bash
npx prettier --write src/
npx eslint src/ --fix
```

## Commit Guidelines

- Use clear, descriptive commit messages
- Reference issues if applicable: `Fixes #123`
- Use present tense: "Add feature" not "Added feature"

Examples:
```
Add Discord webhook support
Fix CAPTCHA detection on login
Update browser timeout configuration
Refactor GameClaimer logic
```

## Pull Request Process

1. **Update documentation** if needed (README.md, SETUP.md, etc.)
2. **Add tests** for new functionality
3. **Run tests**: `npm run test && npm run test:watch`
4. **Keep commits clean**: Rebase if needed
5. **Write clear PR description**: What changed and why
6. **Reference related issues**: Use #123

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## How to Test
Steps to verify the changes work

## Screenshots
If applicable, add screenshots

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Code follows style guide
- [ ] No breaking changes
```

## Areas for Contribution

### Bug Reports

Found a bug? Create an issue with:
- Description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment info (OS, Node version, etc.)
- Logs from `./logs/` directory

### Feature Requests

Have an idea? Create an issue with:
- Description of the feature
- Why it would be useful
- Possible implementation approach

### Documentation

Help improve docs:
- Fix typos
- Add examples
- Clarify confusing sections
- Add troubleshooting guides

### Testing

- Write unit tests
- Add E2E tests
- Test on different platforms

### Code Improvements

- Fix existing bugs
- Optimize performance
- Improve error handling
- Refactor complex code

## Development Tips

### Debug Mode

```bash
npm run debug
```

### View Logs

```bash
tail -f logs/epic-claimer-*.log
```

### Clear State

```bash
# Remove built files
npm run clean

# Remove sessions
rm -rf sessions/

# Remove logs
rm -rf logs/

# Reinstall
npm install
npx playwright install
npm run build
```

### Test Configuration

Edit `.env` for testing:

```env
EPIC_EMAIL=test@example.com
EPIC_PASSWORD=test_password
HEADLESS=false
SCREENSHOT_ON_ERROR=true
SCREENSHOT_ON_SUCCESS=true
LOG_LEVEL=debug
```

## Project Structure

```
src/
├── config.ts           # Configuration management
├── logger.ts           # Logging setup
├── browser.ts          # Browser automation & management
├── auth.ts             # Epic Games authentication
├── gameDetector.ts     # Free game detection
├── gameClaimer.ts      # Game claiming logic
├── notifications.ts    # Discord/Telegram/Email
├── index.ts            # Main orchestrator
├── cli/                # CLI commands
└── __tests__/          # Unit tests
```

## Key Modules

### BrowserManager (`browser.ts`)

Handles browser lifecycle and page management:
- Launch/close browser
- Context management
- Session persistence
- Screenshots

### AuthManager (`auth.ts`)

Handles Epic Games authentication:
- Login flow
- Session caching
- Error detection
- CAPTCHA detection

### GameDetector (`gameDetector.ts`)

Detects available free games:
- Navigates to free games page
- Extracts game information
- Filters already owned games
- Deduplicates results

### GameClaimer (`gameClaimer.ts`)

Claims games automatically:
- Navigates to game page
- Clicks claim button
- Handles popups
- Retries on failure

### NotificationManager (`notifications.ts`)

Sends notifications:
- Discord webhooks
- Telegram messages
- Email (future)

## Testing Standards

- Write tests for new features
- Aim for >80% code coverage
- Use descriptive test names
- Mock external APIs
- Test error cases

Example test:

```typescript
describe('GameClaimer', () => {
  test('should claim game successfully', async () => {
    const claimer = new GameClaimer(mockBrowserManager);
    const result = await claimer.claimGame(mockGame);
    
    expect(result.success).toBe(true);
    expect(result.gameName).toBe('Test Game');
  });
});
```

## Performance Considerations

- Use exponential backoff for retries
- Avoid unnecessary page reloads
- Batch operations when possible
- Cache login sessions
- Use stable selectors

## Security Considerations

- Never log credentials
- Use HTTPS for notifications
- Sanitize user input
- Validate external data
- Use environment variables for secrets

## Documentation Standards

- Add JSDoc comments for exports
- Update README for user-facing changes
- Add examples in SETUP.md
- Update TROUBLESHOOTING.md for known issues
- Add CHANGELOG entries

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. Create GitHub release

## Questions?

- Check existing issues and discussions
- Review documentation
- Ask in GitHub issues
- Check code comments

## License

By contributing, you agree your code will be licensed under MIT license.

---

Thank you for contributing! 🎮
