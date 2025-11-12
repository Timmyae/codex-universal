# Testing Guide

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Security Tests Only
```bash
npm run test:security
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm test
# Coverage report will be in coverage/ directory
# Open coverage/index.html in browser for detailed view
```

## Test Structure

```
tests/
├── jest.config.js          # Jest configuration
├── setup.js                # Test environment setup
├── unit/                   # Unit tests
│   ├── pkce.utils.test.js
│   ├── token.utils.test.js
│   ├── crypto.utils.test.js
│   └── redirect-validation.test.js
├── integration/            # Integration tests
│   └── oauth-flow.test.js
└── security/              # Security tests
    └── attack-prevention.test.js
```

## Coverage Requirements

- **Overall:** 80% minimum
- **PKCE utilities:** 100% (critical security)
- **Token utilities:** 95% (critical security)
- **Other utilities:** 80% minimum

## Writing Tests

### Unit Test Example

```javascript
describe('Feature Name', () => {
  test('should do something specific', () => {
    const result = functionToTest(input);
    expect(result).toBe(expectedOutput);
  });

  test('should handle edge case', () => {
    expect(() => functionToTest(invalidInput)).toThrow();
  });
});
```

### Integration Test Example

```javascript
const request = require('supertest');
const app = require('../server/app');

describe('API Endpoint', () => {
  test('should return expected response', async () => {
    const response = await request(app)
      .get('/endpoint')
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

### Security Test Example

```javascript
describe('Security Feature', () => {
  test('should prevent attack', async () => {
    const response = await request(app)
      .post('/endpoint')
      .send({ malicious: 'input' })
      .expect(400);

    expect(response.body.error).toBe('invalid_request');
  });
});
```

## Test Environment

Tests run with:
- `NODE_ENV=test`
- In-memory token storage
- Mock GitHub OAuth responses
- Test credentials in `.env.test`

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Debugging Tests

### Run Single Test
```bash
npm test -- pkce.utils.test.js
```

### Run with Verbose Output
```bash
npm test -- --verbose
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Best Practices

1. **Test Independence:** Each test should run independently
2. **Clear Names:** Use descriptive test names
3. **Arrange-Act-Assert:** Structure tests clearly
4. **Mock External Services:** Don't call real APIs
5. **Clean Up:** Reset state after tests
6. **Coverage:** Aim for high coverage of critical paths
7. **Edge Cases:** Test error conditions and boundaries
