/// Chat Bubble Widget - Premium Design matching Web App
library;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../../../../core/theme/app_theme.dart';
import '../../domain/message.dart';
import 'tool_indicator.dart';
import 'weather_card.dart';
import 'image_card.dart';

class ChatBubble extends StatelessWidget {
  final Message message;
  final bool showAvatar;

  const ChatBubble({
    super.key,
    required this.message,
    this.showAvatar = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (message.isUser) {
      return _buildUserBubble(context, isDark);
    } else {
      return _buildAssistantBubble(context, isDark);
    }
  }

  Widget _buildUserBubble(BuildContext context, bool isDark) {
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        margin: const EdgeInsets.only(left: 48, right: 16, top: 4, bottom: 4),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            gradient: AppColors.userBubbleGradient,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(20),
              topRight: Radius.circular(20),
              bottomLeft: Radius.circular(20),
              bottomRight: Radius.circular(6),
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.primaryGreen.withOpacity(0.25),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Text(
            message.content,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 15,
              height: 1.4,
            ),
          ),
        ),
      ),
    ).animate().fadeIn(duration: 200.ms).slideX(begin: 0.1, end: 0);
  }

  Widget _buildAssistantBubble(BuildContext context, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(right: 48, left: 8, top: 4, bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar
          if (showAvatar) ...[
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                gradient: AppColors.avatarGradient,
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primaryGreen.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Center(
                child: Text('🐰', style: TextStyle(fontSize: 16)),
              ),
            ),
            const SizedBox(width: 12),
          ],

          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Tool indicator
                if (message.toolName != null && message.content.isEmpty)
                  ToolIndicator(toolName: message.toolName!),

                // Weather card
                if (message.weatherData != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: WeatherCard(data: message.weatherData!),
                  ),

                // Generated image
                if (message.generatedImage != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: ImageCard(
                      imageUrl: message.generatedImage!['url'] as String,
                      prompt: message.generatedImage!['prompt'] as String?,
                    ),
                  ),

                // Message content
                if (message.content.isNotEmpty)
                  _buildMessageContent(context, isDark),

                // Streaming cursor
                if (message.isStreaming && message.content.isNotEmpty)
                  _buildStreamingCursor(),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms).slideX(begin: -0.1, end: 0);
  }

  Widget _buildMessageContent(BuildContext context, bool isDark) {
    return MarkdownBody(
      data: message.content,
      selectable: true,
      styleSheet: MarkdownStyleSheet(
        p: TextStyle(
          fontSize: 15,
          height: 1.5,
          color: isDark
              ? AppColors.darkForegroundSecondary
              : AppColors.lightForegroundSecondary,
        ),
        h1: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w600,
          color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
        ),
        h2: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
        ),
        code: TextStyle(
          backgroundColor: isDark
              ? AppColors.darkBackgroundSecondary
              : AppColors.lightBackgroundSecondary,
          fontFamily: 'monospace',
          fontSize: 13,
        ),
        codeblockDecoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E1E1E) : const Color(0xFFF5F5F5),
          borderRadius: BorderRadius.circular(8),
        ),
        blockquoteDecoration: const BoxDecoration(
          border: Border(
            left: BorderSide(
              color: AppColors.primaryGreen,
              width: 3,
            ),
          ),
        ),
        listBullet: const TextStyle(
          color: AppColors.primaryGreen,
        ),
        a: const TextStyle(
          color: AppColors.primaryGreen,
          decoration: TextDecoration.underline,
        ),
      ),
    );
  }

  Widget _buildStreamingCursor() {
    return Container(
      width: 2,
      height: 18,
      margin: const EdgeInsets.only(top: 4),
      decoration: BoxDecoration(
        color: AppColors.primaryGreen,
        borderRadius: BorderRadius.circular(1),
      ),
    )
        .animate(onPlay: (c) => c.repeat())
        .fadeIn(duration: 400.ms)
        .then()
        .fadeOut(duration: 400.ms);
  }
}
