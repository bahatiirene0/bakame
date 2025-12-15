/// API Constants for Bakame AI
///
/// Environment variables are passed via --dart-define at build time:
/// flutter build apk --dart-define=API_URL=https://bakame.ai
library;

class ApiConstants {
  // ============================================
  // Environment Configuration
  // ============================================

  /// Base URL for API calls
  /// Override with: --dart-define=API_URL=https://your-domain.com
  /// Defaults to production URL
  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://bakame.ai',
  );

  /// Environment name (development, staging, production)
  static const String environment = String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: 'production',
  );

  /// Check if running in debug/development mode
  static bool get isDevelopment => environment == 'development';
  static bool get isProduction => environment == 'production';

  // ============================================
  // API Endpoints
  // ============================================

  static const String chatEndpoint = '/api/chat';
  static const String uploadEndpoint = '/api/upload';
  static const String healthEndpoint = '/api/health';

  // ============================================
  // Supabase Configuration
  // ============================================

  /// Supabase URL - can be overridden for different environments
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://zzefonxyopurbtlxjjds.supabase.co',
  );

  /// Supabase Anonymous Key (safe to expose - has RLS protection)
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6ZWZvbnh5b3B1cmJ0bHhqamRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODY4MjYsImV4cCI6MjA4MDg2MjgyNn0.vn94aXGhiB8oEJoysIrBWtet7KZ5dsUokS-rR9ZKSRg',
  );

  // ============================================
  // OAuth Configuration
  // ============================================

  /// Google OAuth Web Client ID (same as web app for consistency)
  static const String googleWebClientId = String.fromEnvironment(
    'GOOGLE_WEB_CLIENT_ID',
    defaultValue: '579463169192-eke34rmpd02ol8h1eqhnju0ted85lh8e.apps.googleusercontent.com',
  );

  // ============================================
  // Timeouts
  // ============================================

  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration streamTimeout = Duration(minutes: 5);
}

class AppStrings {
  // App Info
  static const String appName = 'Bakame AI';
  static const String appTagline = "Rwanda's First AI Assistant";

  // Placeholders
  static const String chatPlaceholder = 'Andika ikibazo cyawe...';
  static const String chatPlaceholderEn = 'Type your message...';

  // Messages
  static const String welcomeMessage = 'Muraho! Ndi Bakame, umufasha wawe wa AI. Mbaze ikibazo icyo aricyo cyose!';
  static const String welcomeMessageEn = 'Hello! I am Bakame, your AI assistant. Ask me anything!';

  // Errors
  static const String connectionError = 'Connection failed. Please check your internet.';
  static const String serverError = 'Server error. Please try again later.';
}
