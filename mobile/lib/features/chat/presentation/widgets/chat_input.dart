/// Chat Input Widget - Premium design with gradient border
library;

import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class ChatInput extends StatefulWidget {
  final Function(String) onSend;
  final VoidCallback? onCancel;
  final bool isLoading;
  final bool isStreaming;

  const ChatInput({
    super.key,
    required this.onSend,
    this.onCancel,
    this.isLoading = false,
    this.isStreaming = false,
  });

  @override
  State<ChatInput> createState() => _ChatInputState();
}

class _ChatInputState extends State<ChatInput> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      setState(() => _isFocused = _focusNode.hasFocus);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _handleSend() {
    final text = _controller.text.trim();
    if (text.isEmpty || widget.isLoading) return;

    widget.onSend(text);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isDisabled = widget.isLoading || widget.isStreaming;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBackground : AppColors.lightBackground,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            gradient: _isFocused
                ? const LinearGradient(
                    colors: [AppColors.primaryGreen, AppColors.primaryYellow, AppColors.primaryGreen],
                  )
                : LinearGradient(
                    colors: isDark
                        ? [Colors.white24, Colors.white10, Colors.white24]
                        : [Colors.grey.shade300, Colors.grey.shade200, Colors.grey.shade300],
                  ),
          ),
          padding: const EdgeInsets.all(1.5),
          child: Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkBackground : AppColors.lightBackground,
              borderRadius: BorderRadius.circular(23),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                // Text input
                Expanded(
                  child: TextField(
                    controller: _controller,
                    focusNode: _focusNode,
                    enabled: !isDisabled,
                    maxLines: 4,
                    minLines: 1,
                    textInputAction: TextInputAction.newline,
                    style: TextStyle(
                      fontSize: 16,
                      color: isDark ? AppColors.darkForeground : AppColors.lightForeground,
                    ),
                    decoration: InputDecoration(
                      hintText: widget.isStreaming
                          ? 'Please wait...'
                          : 'Andika ikibazo cyawe...',
                      hintStyle: TextStyle(
                        color: isDark
                            ? AppColors.darkForegroundMuted
                            : AppColors.lightForegroundMuted,
                      ),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.fromLTRB(20, 14, 8, 14),
                    ),
                    onSubmitted: (_) => _handleSend(),
                  ),
                ),

                // Send/Stop button
                Padding(
                  padding: const EdgeInsets.all(6),
                  child: widget.isStreaming
                      ? _buildStopButton(isDark)
                      : _buildSendButton(isDark),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSendButton(bool isDark) {
    final hasText = _controller.text.trim().isNotEmpty;

    return GestureDetector(
      onTap: hasText && !widget.isLoading ? _handleSend : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: hasText && !widget.isLoading
              ? AppColors.primaryGreen
              : (isDark ? Colors.white12 : Colors.grey.shade200),
          borderRadius: BorderRadius.circular(22),
        ),
        child: widget.isLoading
            ? Padding(
                padding: const EdgeInsets.all(12),
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(
                    hasText ? Colors.white : AppColors.primaryGreen,
                  ),
                ),
              )
            : Icon(
                Icons.arrow_forward,
                color: hasText ? Colors.white : (isDark ? Colors.white38 : Colors.grey),
                size: 22,
              ),
      ),
    );
  }

  Widget _buildStopButton(bool isDark) {
    return GestureDetector(
      onTap: widget.onCancel,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: Colors.red.shade500,
          borderRadius: BorderRadius.circular(22),
        ),
        child: const Icon(
          Icons.stop,
          color: Colors.white,
          size: 22,
        ),
      ),
    );
  }
}
