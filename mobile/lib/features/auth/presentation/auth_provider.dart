/// Auth Provider using Riverpod
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../data/auth_service.dart';

// Auth service provider
final authServiceProvider = Provider<AuthService>((ref) => AuthService());

// Auth state provider
final authStateProvider = StreamProvider<AuthState>((ref) {
  final authService = ref.watch(authServiceProvider);
  return authService.authStateChanges;
});

// Current user provider
final currentUserProvider = Provider<User?>((ref) {
  final authState = ref.watch(authStateProvider);
  return authState.whenData((state) => state.session?.user).value;
});

// Is signed in provider
final isSignedInProvider = Provider<bool>((ref) {
  final user = ref.watch(currentUserProvider);
  return user != null;
});

// User profile provider
final userProfileProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final authService = ref.watch(authServiceProvider);
  if (!authService.isSignedIn) return null;
  return authService.getUserProfile();
});

// Auth notifier for actions
class AuthNotifier extends StateNotifier<AsyncValue<User?>> {
  final AuthService _authService;

  AuthNotifier(this._authService) : super(AsyncValue.data(_authService.currentUser));

  /// Sign in with email and password
  Future<void> signInWithEmail(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      final response = await _authService.signInWithEmail(email, password);
      state = AsyncValue.data(response.user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Sign up with email and password
  Future<void> signUpWithEmail({
    required String email,
    required String password,
    String? fullName,
  }) async {
    state = const AsyncValue.loading();
    try {
      final response = await _authService.signUpWithEmail(
        email: email,
        password: password,
        fullName: fullName,
      );
      state = AsyncValue.data(response.user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Send password reset email
  Future<bool> resetPassword(String email) async {
    try {
      await _authService.resetPassword(email);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Sign in with Google
  Future<void> signInWithGoogle() async {
    state = const AsyncValue.loading();
    try {
      final response = await _authService.signInWithGoogle();
      state = AsyncValue.data(response.user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Sign out
  Future<void> signOut() async {
    state = const AsyncValue.loading();
    try {
      await _authService.signOut();
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Clear error state
  void clearError() {
    if (state.hasError) {
      state = AsyncValue.data(_authService.currentUser);
    }
  }
}

final authNotifierProvider = StateNotifierProvider<AuthNotifier, AsyncValue<User?>>((ref) {
  final authService = ref.watch(authServiceProvider);
  return AuthNotifier(authService);
});
