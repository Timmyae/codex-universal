# OAuth Setup

Comprehensive OAuth 2.0 setup with PKCE, token rotation, and security features. Currently supports TikTok OAuth provider with plans to support additional providers.

## Features

- **OAuth 2.0 Authorization Code Flow** with PKCE (Proof Key for Code Exchange)
- **TikTok OAuth Provider** - Full implementation of TikTok Login Kit
- **Token Rotation** - Automatic refresh token rotation for enhanced security
- **Session Management** - Secure session handling with express-session
- **CSRF Protection** - State parameter validation
- **Redirect URI Validation** - Whitelist-based redirect URI security
- **Comprehensive Testing** - Unit and integration tests with high coverage

## Prerequisites

- Node.js 18.x or higher
- npm or yarn
- TikTok Developer Account (for TikTok OAuth)

## Installation

```bash
cd oauth-setup
npm ci
```

## Configuration

### Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and configure your OAuth credentials:

#### Required TikTok OAuth Variables
```bash
TIKTOK_CLIENT_ID=your-tiktok-client-id
TIKTOK_CLIENT_SECRET=your-tiktok-client-secret
TIKTOK_REDIRECT_URI=http://localhost:3000/auth/tiktok/callback
ALLOWED_REDIRECT_URIS=http://localhost:3000/auth/tiktok/callback,http://localhost:8080/auth/tiktok/callback
```

#### Required Security Variables
```bash
JWT_SECRET=your-jwt-secret-change-this
SESSION_SECRET=your-session-secret-change-this
```

### Getting TikTok OAuth Credentials

1. Visit [TikTok for Developers](https://developers.tiktok.com/)
2. Create a new app or select an existing one
3. Navigate to your app settings
4. Copy the **Client Key** (use as `TIKTOK_CLIENT_ID`)
5. Copy the **Client Secret** (use as `TIKTOK_CLIENT_SECRET`)
6. Configure redirect URIs in your TikTok app to match your `TIKTOK_REDIRECT_URI`

For more details, see the [TikTok Login Kit Documentation](https://developers.tiktok.com/doc/login-kit-web).

## Running the Server

### Development Mode
```bash
npm start
```

The server will start on port 3000 (or the port specified in your `.env` file).

### Available Endpoints

- `GET /auth/tiktok` - Initiate TikTok OAuth authorization
- `GET /auth/tiktok/callback` - OAuth callback handler
- `POST /auth/tiktok/refresh` - Refresh access token
- `POST /auth/tiktok/revoke` - Revoke access token
- `GET /auth/tiktok/user` - Get user information

## Testing

### Run All Tests
```bash
npm test
```

This runs both unit and integration tests with coverage reporting.

### Run Unit Tests Only
```bash
npm run test:unit
```

### Run Tests in CI Mode
```bash
npm run ci
```

### Watch Mode for Development
```bash
npm run test:watch
```

### Test Coverage

The project maintains 80%+ code coverage across:
- Branches
- Functions
- Lines
- Statements

Coverage reports are generated in the `coverage/` directory after running tests.

## CI/CD

This project includes GitHub Actions CI that automatically:
- Runs tests on push and pull requests
- Validates code coverage thresholds
- Uploads coverage artifacts

For CI configuration and GitHub Secrets setup, see [docs/CI_AND_SECRETS.md](../docs/CI_AND_SECRETS.md).

## Project Structure

```
oauth-setup/
├── server/
│   ├── config/
│   │   └── providers/
│   │       └── tiktok.config.js    # TikTok OAuth configuration
│   ├── controllers/
│   │   └── auth/
│   │       └── tiktok.controller.js # TikTok OAuth controller
│   ├── middleware/
│   │   └── redirect-validation.middleware.js
│   ├── routes/
│   │   └── auth/
│   │       └── tiktok.routes.js     # TikTok OAuth routes
│   ├── utils/
│   │   ├── pkce.utils.js            # PKCE implementation
│   │   └── token.utils.js           # Token management
│   ├── app.js                        # Express app setup
│   └── server.js                     # Server entry point
├── tests/
│   ├── unit/                         # Unit tests
│   └── integration/                  # Integration tests
├── .env.example                      # Environment template
├── jest.config.js                    # Jest configuration
└── package.json
```

## Security Features

- **PKCE (Proof Key for Code Exchange)**: Prevents authorization code interception
- **State Parameter**: CSRF protection for OAuth flows
- **Redirect URI Validation**: Whitelist-based redirect URI security
- **Token Rotation**: Automatic refresh token rotation
- **Refresh Token Reuse Detection**: Detects and prevents token reuse attacks
- **Secure Cookies**: HttpOnly and SameSite cookie attributes
- **Rate Limiting**: Protection against brute force attacks

## Documentation

- [CI and GitHub Secrets Configuration](../docs/CI_AND_SECRETS.md)
- [TikTok Next.js Integration Example](docs/TIKTOK_NEXTJS_EXAMPLE.md)

## Troubleshooting

### Tests fail with "Missing or placeholder configuration"

This is a warning, not an error. Tests mock all external API calls and should still pass with dummy credentials. If you want to test with real credentials, configure your `.env` file with actual TikTok OAuth credentials.

### Port already in use

If port 3000 is already in use, change the `PORT` variable in your `.env` file:
```bash
PORT=3001
```

### Environment variables not loading

Ensure:
1. The `.env` file is in the `oauth-setup/` directory (not in the project root)
2. The file is named exactly `.env` (not `.env.txt` or similar)
3. Variable names match exactly (case-sensitive)

## Contributing

When contributing:
1. Ensure all tests pass: `npm test`
2. Maintain code coverage above 80%
3. Follow existing code style
4. Add tests for new features
5. Update documentation as needed

## License

MIT
