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

  Future<void> signInWithGoogle() async {
    state = const AsyncValue.loading();
    try {
      final response = await _authService.signInWithGoogle();
      state = AsyncValue.data(response.user);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> signOut() async {
    state = const AsyncValue.loading();
    try {
      await _authService.signOut();
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final authNotifierProvider = StateNotifierProvider<AuthNotifier, AsyncValue<User?>>((ref) {
  final authService = ref.watch(authServiceProvider);
  return AuthNotifier(authService);
});
