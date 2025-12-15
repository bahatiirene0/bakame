/// Authentication Service using Supabase + Google Sign-In
library;

import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/constants/api_constants.dart';

/// Authentication error types
class AuthException implements Exception {
  final String message;
  final String? code;

  AuthException(this.message, {this.code});

  @override
  String toString() => message;

  /// Parse Supabase auth errors into user-friendly messages
  static String parseError(dynamic error) {
    final errorStr = error.toString().toLowerCase();

    if (errorStr.contains('invalid login credentials') ||
        errorStr.contains('invalid_credentials')) {
      return 'Invalid email or password. Please try again.';
    }
    if (errorStr.contains('email not confirmed')) {
      return 'Please verify your email before signing in.';
    }
    if (errorStr.contains('user already registered') ||
        errorStr.contains('email_exists')) {
      return 'An account with this email already exists.';
    }
    if (errorStr.contains('weak password') ||
        errorStr.contains('password')) {
      return 'Password must be at least 6 characters.';
    }
    if (errorStr.contains('invalid email') ||
        errorStr.contains('email')) {
      return 'Please enter a valid email address.';
    }
    if (errorStr.contains('network') ||
        errorStr.contains('connection')) {
      return 'Network error. Please check your connection.';
    }
    if (errorStr.contains('rate limit')) {
      return 'Too many attempts. Please try again later.';
    }

    return 'Authentication failed. Please try again.';
  }
}

class AuthService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    serverClientId: ApiConstants.googleWebClientId,
  );

  /// Get current user
  User? get currentUser => _supabase.auth.currentUser;

  /// Get current session
  Session? get currentSession => _supabase.auth.currentSession;

  /// Check if user is signed in
  bool get isSignedIn => currentUser != null;

  /// Auth state changes stream
  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;

  /// Sign in with email and password
  Future<AuthResponse> signInWithEmail(String email, String password) async {
    try {
      final response = await _supabase.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
      return response;
    } catch (e) {
      debugPrint('Email Sign In Error: $e');
      throw AuthException(AuthException.parseError(e));
    }
  }

  /// Sign up with email and password
  Future<AuthResponse> signUpWithEmail({
    required String email,
    required String password,
    String? fullName,
  }) async {
    try {
      final response = await _supabase.auth.signUp(
        email: email.trim(),
        password: password,
        data: fullName != null ? {'full_name': fullName} : null,
      );

      // Check if email confirmation is required
      if (response.user != null && response.session == null) {
        throw AuthException(
          'Please check your email to verify your account.',
          code: 'email_confirmation_required',
        );
      }

      return response;
    } catch (e) {
      debugPrint('Email Sign Up Error: $e');
      if (e is AuthException) rethrow;
      throw AuthException(AuthException.parseError(e));
    }
  }

  /// Send password reset email
  Future<void> resetPassword(String email) async {
    try {
      await _supabase.auth.resetPasswordForEmail(email.trim());
    } catch (e) {
      debugPrint('Password Reset Error: $e');
      throw AuthException(AuthException.parseError(e));
    }
  }

  /// Resend confirmation email
  Future<void> resendConfirmationEmail(String email) async {
    try {
      await _supabase.auth.resend(
        type: OtpType.signup,
        email: email.trim(),
      );
    } catch (e) {
      debugPrint('Resend Confirmation Error: $e');
      throw AuthException(AuthException.parseError(e));
    }
  }

  /// Sign in with Google
  Future<AuthResponse> signInWithGoogle() async {
    try {
      // Trigger Google Sign In
      final googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        throw AuthException('Google Sign In cancelled');
      }

      // Get auth tokens
      final googleAuth = await googleUser.authentication;
      final accessToken = googleAuth.accessToken;
      final idToken = googleAuth.idToken;

      if (accessToken == null || idToken == null) {
        throw AuthException('Missing Google Auth Token');
      }

      // Sign in to Supabase
      final response = await _supabase.auth.signInWithIdToken(
        provider: OAuthProvider.google,
        idToken: idToken,
        accessToken: accessToken,
      );

      return response;
    } catch (e) {
      debugPrint('Google Sign In Error: $e');
      if (e is AuthException) rethrow;
      throw AuthException(AuthException.parseError(e));
    }
  }

  /// Sign out
  Future<void> signOut() async {
    await _googleSignIn.signOut();
    await _supabase.auth.signOut();
  }

  /// Get user profile from database
  Future<Map<String, dynamic>?> getUserProfile() async {
    final userId = currentUser?.id;
    if (userId == null) return null;

    try {
      final response = await _supabase
          .from('profiles')
          .select()
          .eq('id', userId)
          .single();
      return response;
    } catch (e) {
      debugPrint('Get profile error: $e');
      return null;
    }
  }

  /// Update user profile
  Future<void> updateProfile({
    String? name,
    String? avatarUrl,
  }) async {
    final userId = currentUser?.id;
    if (userId == null) return;

    await _supabase.from('profiles').upsert({
      'id': userId,
      if (name != null) 'name': name,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
      'updated_at': DateTime.now().toIso8601String(),
    });
  }
}
