/**
 * Authentication Controller / وحدة تحكم المصادقة
 * 
 * Handles OAuth authentication flow and user management
 * يتعامل مع تدفق مصادقة OAuth وإدارة المستخدم
 */

const axios = require('axios');
const { getProviderConfig } = require('../config/oauth.config');
const { generateToken, generateRefreshToken } = require('../utils/token.utils');

/**
 * Initiate GitHub OAuth flow
 * بدء تدفق مصادقة GitHub OAuth
 * 
 * Redirects user to GitHub authorization page
 * يعيد توجيه المستخدم إلى صفحة تفويض GitHub
 */
async function initiateGitHubAuth(req, res) {
  try {
    const config = getProviderConfig('github');
    
    if (!config) {
      return res.status(500).json({
        success: false,
        error: 'GitHub OAuth not configured',
        message: 'GitHub OAuth is not properly configured. Check environment variables.',
        message_ar: 'لم يتم تكوين GitHub OAuth بشكل صحيح. تحقق من متغيرات البيئة.'
      });
    }

    // Generate state parameter for CSRF protection / إنشاء معامل الحالة لحماية CSRF
    const state = generateRandomState();
    
    // Store state in session for verification / تخزين الحالة في الجلسة للتحقق
    req.session.oauthState = state;

    // Build authorization URL / بناء عنوان URL للتفويض
    const authUrl = new URL(config.authorizationUrl);
    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append('redirect_uri', config.callbackUrl);
    authUrl.searchParams.append('scope', config.scopes.join(' '));
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('allow_signup', 'true');

    // Redirect to GitHub authorization page / إعادة التوجيه إلى صفحة تفويض GitHub
    res.redirect(authUrl.toString());
  } catch (error) {
    console.error('Error initiating GitHub auth:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate authentication',
      message: error.message,
      message_ar: 'فشل بدء المصادقة'
    });
  }
}

/**
 * Handle GitHub OAuth callback
 * معالجة رد اتصال GitHub OAuth
 * 
 * Exchanges authorization code for access token and user information
 * يستبدل رمز التفويض برمز الوصول ومعلومات المستخدم
 */
async function handleGitHubCallback(req, res) {
  try {
    const { code, state } = req.query;

    // Validate state parameter / التحقق من صحة معامل الحالة
    if (!state || state !== req.session.oauthState) {
      return res.status(400).json({
        success: false,
        error: 'Invalid state parameter',
        message: 'CSRF validation failed',
        message_ar: 'فشل التحقق من CSRF'
      });
    }

    // Clear state from session / مسح الحالة من الجلسة
    delete req.session.oauthState;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code not provided',
        message: 'OAuth authorization failed',
        message_ar: 'فشل تفويض OAuth'
      });
    }

    const config = getProviderConfig('github');
    
    // Exchange code for access token / استبدال الرمز برمز الوصول
    const tokenResponse = await axios.post(
      config.tokenUrl,
      {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
        redirect_uri: config.callbackUrl
      },
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      throw new Error('Failed to obtain access token');
    }

    // Fetch user information / جلب معلومات المستخدم
    const userProfile = await getUserProfile('github', accessToken);

    // Generate JWT tokens / إنشاء رموز JWT
    const jwtToken = generateToken({
      id: userProfile.id,
      email: userProfile.email,
      username: userProfile.login,
      provider: 'github'
    });

    const refreshToken = generateRefreshToken({
      id: userProfile.id,
      provider: 'github'
    });

    // Store user in session / تخزين المستخدم في الجلسة
    req.session.user = {
      id: userProfile.id,
      email: userProfile.email,
      username: userProfile.login,
      name: userProfile.name,
      avatar: userProfile.avatar_url,
      provider: 'github'
    };

    // Return success response with tokens / إرجاع استجابة النجاح مع الرموز
    res.json({
      success: true,
      message: 'Authentication successful',
      message_ar: 'تمت المصادقة بنجاح',
      data: {
        user: req.session.user,
        token: jwtToken,
        refreshToken: refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });
  } catch (error) {
    console.error('Error in GitHub callback:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: error.message,
      message_ar: 'فشلت المصادقة'
    });
  }
}

/**
 * Get user profile from OAuth provider
 * احصل على ملف تعريف المستخدم من مزود OAuth
 * 
 * @param {string} provider - OAuth provider name
 * @param {string} accessToken - Access token from OAuth provider
 * @returns {Object} User profile information
 */
async function getUserProfile(provider, accessToken) {
  const config = getProviderConfig(provider);
  
  if (!config) {
    throw new Error(`Provider ${provider} not configured`);
  }

  try {
    // Fetch user profile / جلب ملف تعريف المستخدم
    const userResponse = await axios.get(config.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'User-Agent': 'codex-universal-oauth'
      }
    });

    const userProfile = userResponse.data;

    // For GitHub, fetch email if not in profile / بالنسبة لـ GitHub، احصل على البريد الإلكتروني إذا لم يكن في الملف الشخصي
    if (provider === 'github' && !userProfile.email && config.userEmailUrl) {
      try {
        const emailResponse = await axios.get(config.userEmailUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'User-Agent': 'codex-universal-oauth'
          }
        });

        // Get primary email / احصل على البريد الإلكتروني الأساسي
        const primaryEmail = emailResponse.data.find(email => email.primary);
        if (primaryEmail) {
          userProfile.email = primaryEmail.email;
        }
      } catch (emailError) {
        console.error('Error fetching email:', emailError.message);
      }
    }

    return userProfile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw new Error('Failed to fetch user profile');
  }
}

/**
 * Logout user
 * تسجيل خروج المستخدم
 */
function logout(req, res) {
  // Clear session / مسح الجلسة
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({
        success: false,
        error: 'Logout failed',
        message: 'Failed to clear session',
        message_ar: 'فشل مسح الجلسة'
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
      message_ar: 'تم تسجيل الخروج بنجاح'
    });
  });
}

/**
 * Get authentication status
 * احصل على حالة المصادقة
 */
function getAuthStatus(req, res) {
  if (req.session && req.session.user) {
    return res.json({
      success: true,
      authenticated: true,
      user: req.session.user
    });
  }

  res.json({
    success: true,
    authenticated: false,
    user: null
  });
}

/**
 * Generate random state for CSRF protection
 * إنشاء حالة عشوائية لحماية CSRF
 * 
 * @returns {string} Random state string
 */
function generateRandomState() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Generic OAuth initialization (for future providers)
 * تهيئة OAuth العامة (للمزودين المستقبليين)
 */
async function initiateOAuth(req, res) {
  const { provider } = req.params;
  
  try {
    const config = getProviderConfig(provider);
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider',
        message: `OAuth provider "${provider}" is not supported or not configured`,
        message_ar: `مزود OAuth "${provider}" غير مدعوم أو غير مكون`
      });
    }

    // Generate state parameter for CSRF protection / إنشاء معامل الحالة لحماية CSRF
    const state = generateRandomState();
    req.session.oauthState = state;

    // Build authorization URL / بناء عنوان URL للتفويض
    const authUrl = new URL(config.authorizationUrl);
    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append('redirect_uri', config.callbackUrl);
    authUrl.searchParams.append('scope', config.scopes.join(' '));
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('response_type', 'code');

    res.redirect(authUrl.toString());
  } catch (error) {
    console.error(`Error initiating ${provider} auth:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate authentication',
      message: error.message,
      message_ar: 'فشل بدء المصادقة'
    });
  }
}

module.exports = {
  initiateGitHubAuth,
  handleGitHubCallback,
  getUserProfile,
  logout,
  getAuthStatus,
  initiateOAuth
};
