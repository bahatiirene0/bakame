/// App Drawer - Navigation sidebar with user profile and actions
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../auth/presentation/auth_provider.dart';

class AppDrawer extends ConsumerWidget {
  final VoidCallback onNewChat;
  final VoidCallback onSettings;

  const AppDrawer({
    super.key,
    required this.onNewChat,
    required this.onSettings,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Drawer(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      child: SafeArea(
        child: Column(
          children: [
            // Header with logo and close button
            _buildHeader(context, isDark),

            const SizedBox(height: 8),

            // User profile section
            _buildUserSection(context, isDark, user, ref),

            const Divider(height: 32),

            // New Chat button
            _buildMenuItem(
              context,
              isDark,
              icon: Icons.add_circle_outline,
              label: 'New Chat',
              onTap: () {
                Navigator.pop(context);
                onNewChat();
              },
            ),

            // Chat history (placeholder for now)
            _buildMenuItem(
              context,
              isDark,
              icon: Icons.history,
              label: 'Chat History',
              onTap: () {
                Navigator.pop(context);
                _showComingSoon(context);
              },
            ),

            const Divider(height: 32),

            // Settings
            _buildMenuItem(
              context,
              isDark,
              icon: Icons.settings_outlined,
              label: 'Settings',
              onTap: () {
                Navigator.pop(context);
                onSettings();
              },
            ),

            // About
            _buildMenuItem(
              context,
              isDark,
              icon: Icons.info_outline,
              label: 'About Bakame',
              onTap: () {
                Navigator.pop(context);
                _showAbout(context, isDark);
              },
            ),

            const Spacer(),

            // Logout or Sign In button
            if (user != null)
              _buildLogoutButton(context, ref, isDark)
            else
              _buildSignInButton(context, isDark),

            const SizedBox(height: 16),

            // Version
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'v1.0.0',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark
                      ? AppColors.darkForegroundMuted
                      : AppColors.lightForegroundMuted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: AppColors.avatarGradient,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Center(
              child: Text('🐰', style: TextStyle(fontSize: 20)),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Bakame AI',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const Spacer(),
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }

  Widget _buildUserSection(BuildContext context, bool isDark, user, WidgetRef ref) {
    if (user == null) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark
              ? AppColors.darkBackgroundSecondary
              : AppColors.lightBackgroundSecondary,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.person_outline,
                color: isDark
                    ? AppColors.darkForegroundMuted
                    : AppColors.lightForegroundMuted,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Guest User',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    'Sign in to save chats',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final email = user.email ?? '';
    final name = user.userMetadata?['full_name'] ??
                 user.userMetadata?['name'] ??
                 email.split('@').first;
    final avatarUrl = user.userMetadata?['avatar_url'] ??
                      user.userMetadata?['picture'];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.darkBackgroundSecondary
            : AppColors.lightBackgroundSecondary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          if (avatarUrl != null)
            CircleAvatar(
              radius: 24,
              backgroundImage: NetworkImage(avatarUrl),
              onBackgroundImageError: (_, __) {},
            )
          else
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: AppColors.avatarGradient,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  name.isNotEmpty ? name[0].toUpperCase() : '?',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: Theme.of(context).textTheme.titleMedium,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  email,
                  style: Theme.of(context).textTheme.bodySmall,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem(
    BuildContext context,
    bool isDark, {
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(
        icon,
        color: isDark
            ? AppColors.darkForegroundSecondary
            : AppColors.lightForegroundSecondary,
      ),
      title: Text(label),
      onTap: onTap,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
    );
  }

  Widget _buildLogoutButton(BuildContext context, WidgetRef ref, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: SizedBox(
        width: double.infinity,
        child: OutlinedButton.icon(
          onPressed: () async {
            Navigator.pop(context);
            await ref.read(authNotifierProvider.notifier).signOut();
            if (context.mounted) {
              Navigator.of(context).pushReplacementNamed('/login');
            }
          },
          icon: Icon(
            Icons.logout,
            color: Colors.red.shade400,
          ),
          label: Text(
            'Sign Out',
            style: TextStyle(color: Colors.red.shade400),
          ),
          style: OutlinedButton.styleFrom(
            side: BorderSide(color: Colors.red.shade400),
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSignInButton(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () {
            Navigator.pop(context);
            Navigator.of(context).pushReplacementNamed('/login');
          },
          icon: const Icon(Icons.login),
          label: const Text('Sign In'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryGreen,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ),
    );
  }

  void _showComingSoon(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Chat history coming soon!'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _showAbout(BuildContext context, bool isDark) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                gradient: AppColors.avatarGradient,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Center(
                child: Text('🐰', style: TextStyle(fontSize: 16)),
              ),
            ),
            const SizedBox(width: 10),
            const Text('Bakame AI'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Rwanda's First AI Assistant",
              style: TextStyle(fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 12),
            const Text(
              'Bakame AI combines multiple AI models to help you with:',
            ),
            const SizedBox(height: 8),
            const Text('• Chat & Conversation'),
            const Text('• Image Generation'),
            const Text('• Video Creation'),
            const Text('• Web Search'),
            const Text('• Weather Information'),
            const Text('• Maps & Directions'),
            const SizedBox(height: 12),
            Text(
              'Version 1.0.0',
              style: TextStyle(
                color: isDark
                    ? AppColors.darkForegroundMuted
                    : AppColors.lightForegroundMuted,
                fontSize: 12,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
