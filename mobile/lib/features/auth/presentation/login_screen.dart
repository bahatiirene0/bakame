/// Login Screen - Sign In / Sign Up with email and Google
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../core/theme/app_theme.dart';
import 'auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _obscurePassword = true;
  bool _isSignUp = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      setState(() {
        _isSignUp = _tabController.index == 1;
      });
      // Clear error when switching tabs
      ref.read(authNotifierProvider.notifier).clearError();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _handleSubmit() {
    if (!_formKey.currentState!.validate()) return;

    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final name = _nameController.text.trim();

    if (_isSignUp) {
      ref.read(authNotifierProvider.notifier).signUpWithEmail(
            email: email,
            password: password,
            fullName: name.isNotEmpty ? name : null,
          );
    } else {
      ref.read(authNotifierProvider.notifier).signInWithEmail(email, password);
    }
  }

  void _handleForgotPassword() async {
    final email = _emailController.text.trim();

    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter your email address first'),
        ),
      );
      return;
    }

    final success =
        await ref.read(authNotifierProvider.notifier).resetPassword(email);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success
                ? 'Password reset email sent! Check your inbox.'
                : 'Failed to send reset email. Please try again.',
          ),
          backgroundColor: success ? AppColors.primaryGreen : Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final size = MediaQuery.of(context).size;

    // Navigate to chat on successful auth
    ref.listen(authNotifierProvider, (previous, next) {
      if (next.hasValue && next.value != null) {
        Navigator.of(context).pushReplacementNamed('/chat');
      }
    });

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: SizedBox(
            height: size.height - MediaQuery.of(context).padding.vertical - 48,
            child: Form(
              key: _formKey,
              child: Column(
                children: [
                  const SizedBox(height: 20),

                  // Logo
                  _buildLogo(isDark),

                  const SizedBox(height: 24),

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

                  const SizedBox(height: 32),

                  // Tabs
                  _buildTabs(isDark),

                  const SizedBox(height: 24),

                  // Error message
                  if (authState.hasError) _buildError(authState.error, isDark),

                  // Form fields
                  Expanded(
                    child: TabBarView(
                      controller: _tabController,
                      children: [
                        // Sign In Tab
                        _buildSignInForm(authState, isDark),
                        // Sign Up Tab
                        _buildSignUpForm(authState, isDark),
                      ],
                    ),
                  ),

                  // Divider
                  _buildDivider(isDark),

                  const SizedBox(height: 16),

                  // Google Sign In Button
                  _buildGoogleButton(authState, isDark),

                  const SizedBox(height: 16),

                  // Continue as guest
                  _buildGuestButton(isDark),

                  const SizedBox(height: 24),

                  // Terms
                  _buildTerms(isDark),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogo(bool isDark) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        gradient: AppColors.avatarGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryGreen.withOpacity(0.4),
            blurRadius: 30,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: const Center(
        child: Text('🐰', style: TextStyle(fontSize: 40)),
      ),
    ).animate().scale(duration: 500.ms, curve: Curves.elasticOut);
  }

  Widget _buildTabs(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.darkBackgroundSecondary
            : AppColors.lightBackgroundSecondary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: TabBar(
        controller: _tabController,
        indicator: BoxDecoration(
          color: AppColors.primaryGreen,
          borderRadius: BorderRadius.circular(10),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        labelColor: Colors.white,
        unselectedLabelColor: isDark
            ? AppColors.darkForegroundMuted
            : AppColors.lightForegroundMuted,
        dividerColor: Colors.transparent,
        padding: const EdgeInsets.all(4),
        tabs: const [
          Tab(text: 'Sign In'),
          Tab(text: 'Sign Up'),
        ],
      ),
    ).animate().fadeIn(delay: 300.ms);
  }

  Widget _buildError(Object? error, bool isDark) {
    return Container(
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
              error.toString(),
              style: const TextStyle(color: Colors.red, fontSize: 13),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 18),
            color: Colors.red,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            onPressed: () =>
                ref.read(authNotifierProvider.notifier).clearError(),
          ),
        ],
      ),
    );
  }

  Widget _buildSignInForm(AsyncValue authState, bool isDark) {
    return SingleChildScrollView(
      child: Column(
        children: [
          // Email field
          _buildEmailField(isDark),

          const SizedBox(height: 16),

          // Password field
          _buildPasswordField(isDark),

          const SizedBox(height: 8),

          // Forgot password
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: _handleForgotPassword,
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                minimumSize: const Size(0, 0),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                'Forgot Password?',
                style: TextStyle(
                  color: AppColors.primaryGreen,
                  fontSize: 13,
                ),
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Sign In button
          _buildSubmitButton(authState, 'Sign In'),
        ],
      ),
    );
  }

  Widget _buildSignUpForm(AsyncValue authState, bool isDark) {
    return SingleChildScrollView(
      child: Column(
        children: [
          // Name field
          _buildNameField(isDark),

          const SizedBox(height: 16),

          // Email field
          _buildEmailField(isDark),

          const SizedBox(height: 16),

          // Password field
          _buildPasswordField(isDark),

          const SizedBox(height: 24),

          // Sign Up button
          _buildSubmitButton(authState, 'Create Account'),
        ],
      ),
    );
  }

  Widget _buildNameField(bool isDark) {
    return TextFormField(
      controller: _nameController,
      keyboardType: TextInputType.name,
      textCapitalization: TextCapitalization.words,
      decoration: InputDecoration(
        labelText: 'Full Name (Optional)',
        prefixIcon: const Icon(Icons.person_outline),
        filled: true,
        fillColor: isDark
            ? AppColors.darkBackgroundSecondary
            : AppColors.lightBackgroundSecondary,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  Widget _buildEmailField(bool isDark) {
    return TextFormField(
      controller: _emailController,
      keyboardType: TextInputType.emailAddress,
      autocorrect: false,
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter your email';
        }
        if (!value.contains('@') || !value.contains('.')) {
          return 'Please enter a valid email';
        }
        return null;
      },
      decoration: InputDecoration(
        labelText: 'Email',
        prefixIcon: const Icon(Icons.email_outlined),
        filled: true,
        fillColor: isDark
            ? AppColors.darkBackgroundSecondary
            : AppColors.lightBackgroundSecondary,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  Widget _buildPasswordField(bool isDark) {
    return TextFormField(
      controller: _passwordController,
      obscureText: _obscurePassword,
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter your password';
        }
        if (_isSignUp && value.length < 6) {
          return 'Password must be at least 6 characters';
        }
        return null;
      },
      decoration: InputDecoration(
        labelText: 'Password',
        prefixIcon: const Icon(Icons.lock_outline),
        suffixIcon: IconButton(
          icon: Icon(
            _obscurePassword ? Icons.visibility_off : Icons.visibility,
          ),
          onPressed: () {
            setState(() {
              _obscurePassword = !_obscurePassword;
            });
          },
        ),
        filled: true,
        fillColor: isDark
            ? AppColors.darkBackgroundSecondary
            : AppColors.lightBackgroundSecondary,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  Widget _buildSubmitButton(AsyncValue authState, String label) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: authState.isLoading ? null : _handleSubmit,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryGreen,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: authState.isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : Text(
                label,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }

  Widget _buildDivider(bool isDark) {
    return Row(
      children: [
        Expanded(
          child: Divider(
            color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'or',
            style: TextStyle(
              color: isDark
                  ? AppColors.darkForegroundMuted
                  : AppColors.lightForegroundMuted,
            ),
          ),
        ),
        Expanded(
          child: Divider(
            color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          ),
        ),
      ],
    );
  }

  Widget _buildGoogleButton(AsyncValue authState, bool isDark) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: authState.isLoading
            ? null
            : () => ref.read(authNotifierProvider.notifier).signInWithGoogle(),
        style: OutlinedButton.styleFrom(
          backgroundColor: isDark ? AppColors.darkBackgroundSecondary : Colors.white,
          foregroundColor: isDark ? AppColors.darkForeground : Colors.black87,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          side: BorderSide(
            color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          ),
        ),
        child: Row(
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
                fontSize: 15,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2);
  }

  Widget _buildGuestButton(bool isDark) {
    return TextButton(
      onPressed: () {
        Navigator.of(context).pushReplacementNamed('/chat');
      },
      child: Text(
        'Continue as Guest',
        style: TextStyle(
          color:
              isDark ? AppColors.darkForegroundMuted : AppColors.lightForegroundMuted,
        ),
      ),
    ).animate().fadeIn(delay: 500.ms);
  }

  Widget _buildTerms(bool isDark) {
    return Text(
      'By continuing, you agree to our Terms of Service\nand Privacy Policy',
      style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: isDark
                ? AppColors.darkForegroundMuted.withOpacity(0.7)
                : AppColors.lightForegroundMuted.withOpacity(0.7),
          ),
      textAlign: TextAlign.center,
    ).animate().fadeIn(delay: 600.ms);
  }
}
