# TikTok OAuth Integration Example for Next.js

This document provides a comprehensive guide for integrating TikTok OAuth authentication into your Next.js application using the TikTok OAuth provider implemented in this repository.

## Prerequisites

- Next.js 13+ application
- TikTok Developer account and registered app
- OAuth backend server running (from this repository)

## Environment Configuration

Add the following environment variables to your `.env.local` file in your Next.js project:

```env
NEXT_PUBLIC_OAUTH_SERVER_URL=http://localhost:3000
NEXT_PUBLIC_TIKTOK_AUTH_URL=http://localhost:3000/auth/tiktok
```

## Backend Configuration

Ensure your OAuth server's `.env` file contains:

```env
TIKTOK_CLIENT_ID=your_tiktok_client_id
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TIKTOK_REDIRECT_URI=https://my-app.com/auth/tiktok/callback
ALLOWED_REDIRECT_URIS=https://my-app.com/dashboard,https://my-app.com/auth/tiktok/callback
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=30d
```

## Implementation

### 1. Create Login Button Component

Create `components/TikTokLoginButton.tsx`:

```typescript
'use client';

import { useState } from 'react';

export default function TikTokLoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    // Redirect to OAuth server which handles PKCE and state generation
    window.location.href = process.env.NEXT_PUBLIC_TIKTOK_AUTH_URL || '/auth/tiktok';
  };

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
          </svg>
          <span>Login with TikTok</span>
        </>
      )}
    </button>
  );
}
```

### 2. Create Callback Handler Page

Create `app/auth/tiktok/callback/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function TikTokCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get tokens from URL (already processed by backend)
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          setError(errorDescription || error);
          setIsProcessing(false);
          return;
        }

        if (!accessToken) {
          // If tokens not in URL, the backend callback handled it
          // In production, you might have a server-side callback that sets cookies
          setError('No authentication tokens received');
          setIsProcessing(false);
          return;
        }

        // Store tokens securely
        // In production, use httpOnly cookies set by your backend
        localStorage.setItem('tiktok_access_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('tiktok_refresh_token', refreshToken);
        }

        // Redirect to dashboard or home page
        router.push('/dashboard');
      } catch (err) {
        console.error('Callback error:', err);
        setError('Failed to process authentication');
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900">Authentication Error</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-black" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900">
          {isProcessing ? 'Completing authentication...' : 'Redirecting...'}
        </h2>
      </div>
    </div>
  );
}
```

### 3. Create Authentication Hook

Create `hooks/useTikTokAuth.ts`:

```typescript
'use client';

import { useState, useEffect } from 'react';

interface TikTokUser {
  open_id: string;
  display_name?: string;
  avatar_url?: string;
}

export function useTikTokAuth() {
  const [user, setUser] = useState<TikTokUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('tiktok_access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Fetch user info from OAuth server
      const response = await fetch(`${process.env.NEXT_PUBLIC_OAUTH_SERVER_URL}/auth/tiktok/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userData = await response.json();
      setUser(userData);
    } catch (err) {
      console.error('Auth check error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      // Clear invalid tokens
      localStorage.removeItem('tiktok_access_token');
      localStorage.removeItem('tiktok_refresh_token');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('tiktok_access_token');
    localStorage.removeItem('tiktok_refresh_token');
    setUser(null);
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('tiktok_refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_OAUTH_SERVER_URL}/auth/tiktok/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      localStorage.setItem('tiktok_access_token', data.access_token);
      localStorage.setItem('tiktok_refresh_token', data.refresh_token);
      
      return data.access_token;
    } catch (err) {
      console.error('Token refresh error:', err);
      logout();
      throw err;
    }
  };

  return {
    user,
    isLoading,
    error,
    logout,
    refreshToken,
    isAuthenticated: !!user
  };
}
```

### 4. Protected Route Component

Create `components/ProtectedRoute.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTikTokAuth } from '@/hooks/useTikTokAuth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useTikTokAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

### 5. Example Dashboard Page

Create `app/dashboard/page.tsx`:

```typescript
'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useTikTokAuth } from '@/hooks/useTikTokAuth';

export default function DashboardPage() {
  const { user, logout } = useTikTokAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <h1 className="text-xl font-semibold">Dashboard</h1>
              <button
                onClick={logout}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Welcome!</h2>
            {user && (
              <div className="space-y-2">
                <p><strong>User ID:</strong> {user.open_id}</p>
                {user.display_name && (
                  <p><strong>Display Name:</strong> {user.display_name}</p>
                )}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Available Permissions</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>View basic user information</li>
                    <li>Access video list</li>
                    <li>Upload videos</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
```

## Security Best Practices

This implementation follows security best practices outlined in `02-SECURITY-CHECKLIST.md`:

1. **PKCE (Proof Key for Code Exchange)**: Automatically handled by the backend OAuth server
2. **State Parameter**: CSRF protection is implemented in the authorization flow
3. **Token Rotation**: Refresh tokens are automatically rotated on each use
4. **Secure Token Storage**: 
   - In production, use httpOnly cookies instead of localStorage
   - Implement server-side session management
5. **Token Expiry**: 
   - Access tokens: 15 minutes
   - Refresh tokens: 30 days

## Token Management

### Automatic Token Refresh

```typescript
// Example of automatic token refresh with API calls
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { refreshToken } = useTikTokAuth();
  
  const makeRequest = async (token: string) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
  };

  let token = localStorage.getItem('tiktok_access_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  let response = await makeRequest(token);

  // If token expired, refresh and retry
  if (response.status === 401) {
    token = await refreshToken();
    response = await makeRequest(token);
  }

  return response;
}
```

## Testing

To test the integration locally:

1. Start the OAuth server:
   ```bash
   cd oauth-setup
   npm install
   npm start
   ```

2. Start your Next.js application:
   ```bash
   npm run dev
   ```

3. Navigate to your application and click the "Login with TikTok" button

4. You will be redirected to TikTok for authorization

5. After authorization, you'll be redirected back to your callback URL with tokens

## Scopes and Permissions

The TikTok OAuth provider requests the following scopes:

- `user.info.basic`: Access to basic user profile information
- `video.list`: Access to user's video list
- `video.upload`: Permission to upload videos on behalf of the user

To modify scopes, update the `scopes` array in `server/config/providers/tiktok.config.js`.

## Troubleshooting

### Common Issues

1. **"Session not found" error**: Ensure cookies are enabled and session middleware is properly configured
2. **"State parameter mismatch"**: This indicates a potential CSRF attack or cookies being blocked
3. **Token refresh fails**: Check that `JWT_REFRESH_TOKEN_EXPIRY` is set correctly and refresh token hasn't expired

### Debug Mode

Enable debug logging by setting `LOG_LEVEL=debug` in your `.env` file.

## Production Deployment

Before deploying to production:

1. Use HTTPS for all URLs
2. Update `TIKTOK_REDIRECT_URI` to your production callback URL
3. Set `NODE_ENV=production`
4. Use secure session secrets (generate with `crypto.randomBytes(64).toString('hex')`)
5. Implement proper token storage (Redis or database)
6. Enable rate limiting on OAuth endpoints
7. Monitor for suspicious authentication attempts

## References

- [TikTok Login Kit Documentation](https://developers.tiktok.com/doc/login-kit-web)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)

## Support

For issues related to:
- **TikTok OAuth implementation**: Check the OAuth server logs and tests
- **Next.js integration**: Review this documentation and Next.js docs
- **TikTok API**: Refer to TikTok Developer documentation
