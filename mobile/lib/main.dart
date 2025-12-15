/// Bakame AI - Rwanda's First AI Assistant
///
/// Mobile app built with Flutter for iOS and Android
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/constants/api_constants.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/auth_provider.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/chat/presentation/chat_screen.dart';

// Re-export themeModeProvider for use in MaterialApp
export 'features/chat/presentation/chat_screen.dart' show themeModeProvider;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase
  await Supabase.initialize(
    url: ApiConstants.supabaseUrl,
    anonKey: ApiConstants.supabaseAnonKey,
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
    ),
  );

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
    ),
  );

  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(
    const ProviderScope(
      child: BakameApp(),
    ),
  );
}

class BakameApp extends ConsumerWidget {
  const BakameApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp(
      title: 'Bakame AI',
      debugShowCheckedModeBanner: false,

      // Theme
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,

      // Routes
      initialRoute: '/',
      routes: {
        '/': (context) => const AuthGate(),
        '/login': (context) => const LoginScreen(),
        '/chat': (context) => const ChatScreen(),
      },
    );
  }
}

/// Auth Gate - Redirects based on authentication state
class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    return authState.when(
      loading: () => const Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: AppColors.primaryGreen),
              SizedBox(height: 16),
              Text('Loading...'),
            ],
          ),
        ),
      ),
      error: (error, stack) => Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text('Error: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(authStateProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      data: (state) {
        if (state.session != null) {
          return const ChatScreen();
        } else {
          return const LoginScreen();
        }
      },
    );
  }
}
