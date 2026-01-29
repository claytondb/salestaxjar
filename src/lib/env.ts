/**
 * Environment variable validation and access
 * 
 * This module validates environment variables on startup and provides
 * type-safe access to them throughout the application.
 */

// Environment configuration with defaults and validation
const envConfig = {
  // Database
  DATABASE_URL: {
    required: false, // Not required at build time
    default: '',
  },
  DIRECT_URL: {
    required: false,
    default: '',
  },
  
  // Auth
  JWT_SECRET: {
    required: false, // Falls back to dev secret
    default: 'development-secret-change-in-production',
  },
  
  // Stripe
  STRIPE_SECRET_KEY: {
    required: false,
    default: '',
  },
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: {
    required: false,
    default: '',
  },
  STRIPE_WEBHOOK_SECRET: {
    required: false,
    default: '',
  },
  STRIPE_STARTER_PRICE_ID: {
    required: false,
    default: 'price_starter',
  },
  STRIPE_PRO_PRICE_ID: {
    required: false,
    default: 'price_pro',
  },
  STRIPE_BUSINESS_PRICE_ID: {
    required: false,
    default: 'price_business',
  },
  
  // TaxJar
  TAXJAR_API_KEY: {
    required: false,
    default: '',
  },
  TAXJAR_API_URL: {
    required: false,
    default: 'https://api.taxjar.com/v2',
  },
  
  // Resend
  RESEND_API_KEY: {
    required: false,
    default: '',
  },
  FROM_EMAIL: {
    required: false,
    default: 'Sails <noreply@sails.tax>',
  },
  
  // Upstash
  UPSTASH_REDIS_REST_URL: {
    required: false,
    default: '',
  },
  UPSTASH_REDIS_REST_TOKEN: {
    required: false,
    default: '',
  },
  
  // App
  NEXT_PUBLIC_APP_URL: {
    required: false,
    default: 'http://localhost:3000',
  },
  NODE_ENV: {
    required: false,
    default: 'development',
  },
} as const;

type EnvKey = keyof typeof envConfig;

// Get environment variable with fallback
export function getEnv(key: EnvKey): string {
  const value = process.env[key];
  const config = envConfig[key];
  
  if (value !== undefined && value !== '') {
    return value;
  }
  
  return config.default;
}

// Check if an environment variable is configured
export function isEnvConfigured(key: EnvKey): boolean {
  const value = process.env[key];
  return value !== undefined && value !== '';
}

// Service availability checks
export const services = {
  get database() {
    return isEnvConfigured('DATABASE_URL');
  },
  get stripe() {
    return isEnvConfigured('STRIPE_SECRET_KEY');
  },
  get taxjar() {
    return isEnvConfigured('TAXJAR_API_KEY');
  },
  get email() {
    return isEnvConfigured('RESEND_API_KEY');
  },
  get rateLimit() {
    return isEnvConfigured('UPSTASH_REDIS_REST_URL') && isEnvConfigured('UPSTASH_REDIS_REST_TOKEN');
  },
};

// Log service status on startup (server-side only)
export function logServiceStatus() {
  if (typeof window !== 'undefined') return;
  
  console.log('\n🔧 Sails Service Status:');
  console.log('━'.repeat(40));
  console.log(`  Database:     ${services.database ? '✅ Connected' : '⚠️  Not configured'}`);
  console.log(`  Stripe:       ${services.stripe ? '✅ Enabled' : '⚠️  Demo mode'}`);
  console.log(`  TaxJar:       ${services.taxjar ? '✅ API enabled' : '📊 Local rates'}`);
  console.log(`  Email:        ${services.email ? '✅ Resend' : '📝 Console logging'}`);
  console.log(`  Rate Limit:   ${services.rateLimit ? '✅ Upstash' : '💾 In-memory'}`);
  console.log('━'.repeat(40));
  
  if (!services.database && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  WARNING: Database not configured in production!');
  }
  
  if (getEnv('JWT_SECRET') === 'development-secret-change-in-production' && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  WARNING: Using default JWT secret in production!');
  }
  
  console.log('');
}

// Validate required environment variables for production
export function validateEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (process.env.NODE_ENV === 'production') {
    // In production, we need these
    if (!services.database) {
      errors.push('DATABASE_URL is required in production');
    }
    
    if (getEnv('JWT_SECRET') === 'development-secret-change-in-production') {
      errors.push('JWT_SECRET must be set in production');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export typed environment access
export const env = {
  DATABASE_URL: getEnv('DATABASE_URL'),
  DIRECT_URL: getEnv('DIRECT_URL'),
  JWT_SECRET: getEnv('JWT_SECRET'),
  STRIPE_SECRET_KEY: getEnv('STRIPE_SECRET_KEY'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: getEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  STRIPE_WEBHOOK_SECRET: getEnv('STRIPE_WEBHOOK_SECRET'),
  TAXJAR_API_KEY: getEnv('TAXJAR_API_KEY'),
  TAXJAR_API_URL: getEnv('TAXJAR_API_URL'),
  RESEND_API_KEY: getEnv('RESEND_API_KEY'),
  FROM_EMAIL: getEnv('FROM_EMAIL'),
  UPSTASH_REDIS_REST_URL: getEnv('UPSTASH_REDIS_REST_URL'),
  UPSTASH_REDIS_REST_TOKEN: getEnv('UPSTASH_REDIS_REST_TOKEN'),
  NEXT_PUBLIC_APP_URL: getEnv('NEXT_PUBLIC_APP_URL'),
  NODE_ENV: getEnv('NODE_ENV'),
};
