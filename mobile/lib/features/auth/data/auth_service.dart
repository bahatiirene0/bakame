/// Authentication Service using Supabase + Google Sign-In
library;

import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/constants/api_constants.dart';

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

  /// Sign in with Google
  Future<AuthResponse> signInWithGoogle() async {
    try {
      // Trigger Google Sign In
      final googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        throw Exception('Google Sign In cancelled');
      }

      // Get auth tokens
      final googleAuth = await googleUser.authentication;
      final accessToken = googleAuth.accessToken;
      final idToken = googleAuth.idToken;

      if (accessToken == null || idToken == null) {
        throw Exception('Missing Google Auth Token');
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
      rethrow;
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
