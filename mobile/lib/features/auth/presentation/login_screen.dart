/// Login Screen - Premium design with Google Sign-In
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../core/theme/app_theme.dart';
import 'auth_provider.dart';

class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: SizedBox(
            height: size.height - MediaQuery.of(context).padding.vertical - 48,
            child: Column(
              children: [
                const Spacer(),

                // Logo
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    gradient: AppColors.avatarGradient,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryGreen.withOpacity(0.4),
                        blurRadius: 30,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Text('🐰', style: TextStyle(fontSize: 48)),
                  ),
                ).animate().scale(duration: 500.ms, curve: Curves.elasticOut),

                const SizedBox(height: 32),

                // Title
                Text(
                  'Bakame AI',
                  style: Theme.of(context).textTheme.displayLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    letterSpacing: -1,
                  ),
                ).animate().fadeIn(delay: 100.ms),

                const SizedBox(height: 8),

                // Tagline
                Text(
                  "Rwanda's First AI Assistant",
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: isDark
                        ? AppColors.darkForegroundMuted
                        : AppColors.lightForegroundMuted,
                  ),
                ).animate().fadeIn(delay: 200.ms),

                const SizedBox(height: 16),

                // Features
                Text(
                  '🖼️ Image Generation • 🎬 Video Creation • 🔍 Web Search',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: isDark
                        ? AppColors.darkForegroundMuted
                        : AppColors.lightForegroundMuted,
                  ),
                  textAlign: TextAlign.center,
                ).animate().fadeIn(delay: 300.ms),

                const Spacer(),

                // Error message
                if (authState.hasError)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: Colors.red, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            authState.error.toString(),
                            style: const TextStyle(color: Colors.red, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Google Sign In Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: authState.isLoading
                        ? null
                        : () => ref.read(authNotifierProvider.notifier).signInWithGoogle(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.black87,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 2,
                    ),
                    child: authState.isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Image.network(
                                'https://www.google.com/favicon.ico',
                                width: 20,
                                height: 20,
                                errorBuilder: (_, __, ___) => const Icon(
                                  Icons.g_mobiledata,
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 12),
                              const Text(
                                'Continue with Google',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                  ),
                ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2),

                const SizedBox(height: 16),

                // Continue as guest
                TextButton(
                  onPressed: () {
                    // Navigate to chat without auth
                    Navigator.of(context).pushReplacementNamed('/chat');
                  },
                  child: Text(
                    'Continue as Guest',
                    style: TextStyle(
                      color: isDark
                          ? AppColors.darkForegroundMuted
                          : AppColors.lightForegroundMuted,
                    ),
                  ),
                ).animate().fadeIn(delay: 500.ms),

                const SizedBox(height: 32),

                // Terms
                Text(
                  'By continuing, you agree to our Terms of Service\nand Privacy Policy',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: isDark
                        ? AppColors.darkForegroundMuted.withOpacity(0.7)
                        : AppColors.lightForegroundMuted.withOpacity(0.7),
                  ),
                  textAlign: TextAlign.center,
                ).animate().fadeIn(delay: 600.ms),

                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
