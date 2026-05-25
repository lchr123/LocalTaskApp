/**
 * AWS Cognito Configuration
 *
 * Contains configuration for AWS Amplify Auth (Cognito).
 * Replace placeholder values with actual AWS resource IDs before deployment.
 */

/**
 * Development Mock Mode
 *
 * When true, all auth operations (register, login, verify, etc.) will be
 * simulated locally without calling AWS Cognito. Use this to test UI flows
 * without a real backend.
 *
 * Set to false when connecting to a real Cognito User Pool.
 */
export const DEV_MOCK_AUTH = true;

export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'ap-northeast-1_XXXXXXXXX',
      userPoolClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
      loginWith: {
        email: true,
        phone: true,
      },
    },
  },
} as const;

/**
 * AWS Region configuration
 */
export const AWS_REGION = 'ap-northeast-1';

/**
 * Cognito token expiration (in minutes)
 * Access Token is valid for 60 minutes per requirement 2.5
 */
export const TOKEN_EXPIRY_MINUTES = 60;
