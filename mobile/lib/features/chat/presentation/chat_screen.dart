/// Chat Screen - Main chat interface
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/presentation/auth_provider.dart';
import 'chat_provider.dart';
import 'widgets/chat_bubble.dart';
import 'widgets/chat_input.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      Future.delayed(const Duration(milliseconds: 100), () {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final chatState = ref.watch(chatProvider);
    final user = ref.watch(currentUserProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Auto-scroll when messages change
    ref.listen(chatProvider, (previous, next) {
      if (next.messages.length > (previous?.messages.length ?? 0) ||
          next.isStreaming) {
        _scrollToBottom();
      }
    });

    return Scaffold(
      appBar: _buildAppBar(context, isDark, user),
      body: Column(
        children: [
          // Messages list
          Expanded(
            child: chatState.messages.isEmpty
                ? _buildWelcome(context, isDark)
                : _buildMessagesList(chatState, isDark),
          ),

          // Error display
          if (chatState.error != null)
            _buildError(context, chatState.error!, isDark),

          // Input
          ChatInput(
            onSend: (text) => ref.read(chatProvider.notifier).sendMessage(text),
            onCancel: () => ref.read(chatProvider.notifier).cancelStream(),
            isLoading: chatState.isLoading,
            isStreaming: chatState.isStreaming,
          ),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context, bool isDark, user) {
    return AppBar(
      leading: Builder(
        builder: (context) => IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => Scaffold.of(context).openDrawer(),
        ),
      ),
      title: Row(
        mainAxisSize: MainAxisSize.min,
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
          const Text('Bakame'),
        ],
      ),
      actions: [
        // New chat button
        IconButton(
          icon: const Icon(Icons.add),
          onPressed: () => ref.read(chatProvider.notifier).clearMessages(),
          tooltip: 'New Chat',
        ),
        // Theme toggle
        IconButton(
          icon: Icon(isDark ? Icons.light_mode : Icons.dark_mode),
          onPressed: () {
            // TODO: Implement theme toggle
          },
          tooltip: 'Toggle Theme',
        ),
      ],
    );
  }

  Widget _buildWelcome(BuildContext context, bool isDark) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: AppColors.avatarGradient,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primaryGreen.withOpacity(0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Center(
                child: Text('🐰', style: TextStyle(fontSize: 40)),
              ),
            ).animate().scale(duration: 400.ms, curve: Curves.elasticOut),

            const SizedBox(height: 24),

            // Title
            Text(
              'Bakame AI',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ).animate().fadeIn(delay: 100.ms),

            const SizedBox(height: 8),

            // Tagline
            Text(
              "Rwanda's First AI Assistant",
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: isDark
                    ? AppColors.darkForegroundMuted
                    : AppColors.lightForegroundMuted,
              ),
            ).animate().fadeIn(delay: 200.ms),

            const SizedBox(height: 32),

            // Suggestion chips
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                _buildSuggestionChip('🌤️ Weather in Kigali', isDark),
                _buildSuggestionChip('🖼️ Generate an image', isDark),
                _buildSuggestionChip('🔍 Search the web', isDark),
                _buildSuggestionChip('📍 Directions to...', isDark),
              ].animate(interval: 100.ms).fadeIn().slideY(begin: 0.2),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuggestionChip(String text, bool isDark) {
    return GestureDetector(
      onTap: () => ref.read(chatProvider.notifier).sendMessage(text.substring(3)),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isDark
              ? AppColors.darkBackgroundSecondary
              : AppColors.lightBackgroundSecondary,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
          ),
        ),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 14,
            color: isDark
                ? AppColors.darkForegroundSecondary
                : AppColors.lightForegroundSecondary,
          ),
        ),
      ),
    );
  }

  Widget _buildMessagesList(ChatState chatState, bool isDark) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(vertical: 16),
      itemCount: chatState.messages.length,
      itemBuilder: (context, index) {
        final message = chatState.messages[index];
        final showAvatar = index == 0 ||
            chatState.messages[index - 1].role != message.role;

        return ChatBubble(
          message: message,
          showAvatar: showAvatar && message.isAssistant,
        );
      },
    );
  }

  Widget _buildError(BuildContext context, String error, bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              error,
              style: const TextStyle(color: Colors.red, fontSize: 13),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 18),
            onPressed: () => ref.read(chatProvider.notifier).clearError(),
            color: Colors.red,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }
}
