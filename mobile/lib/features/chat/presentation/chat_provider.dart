/// Chat Provider using Riverpod
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../../core/services/sse_client.dart';
import '../../auth/presentation/auth_provider.dart';
import '../domain/message.dart';

// SSE Client provider
final sseClientProvider = Provider<SSEChatClient>((ref) {
  final authService = ref.watch(authServiceProvider);
  return SSEChatClient(
    authToken: authService.currentSession?.accessToken,
  );
});

// Chat state
class ChatState {
  final List<Message> messages;
  final bool isLoading;
  final bool isStreaming;
  final String? error;
  final String? activeSessionId;

  ChatState({
    this.messages = const [],
    this.isLoading = false,
    this.isStreaming = false,
    this.error,
    this.activeSessionId,
  });

  ChatState copyWith({
    List<Message>? messages,
    bool? isLoading,
    bool? isStreaming,
    String? error,
    String? activeSessionId,
  }) {
    return ChatState(
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      isStreaming: isStreaming ?? this.isStreaming,
      error: error,
      activeSessionId: activeSessionId ?? this.activeSessionId,
    );
  }
}

// Chat notifier
class ChatNotifier extends StateNotifier<ChatState> {
  final SSEChatClient _client;
  final Uuid _uuid = const Uuid();

  ChatNotifier(this._client) : super(ChatState());

  /// Send a message and get streaming response
  Future<void> sendMessage(String content) async {
    if (content.trim().isEmpty) return;

    // Add user message
    final userMessage = Message(
      id: _uuid.v4(),
      role: 'user',
      content: content.trim(),
      timestamp: DateTime.now(),
    );

    state = state.copyWith(
      messages: [...state.messages, userMessage],
      isLoading: true,
      isStreaming: true,
      error: null,
    );

    // Create placeholder for assistant
    final assistantId = _uuid.v4();
    final assistantMessage = Message(
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: DateTime.now(),
      isStreaming: true,
    );

    state = state.copyWith(
      messages: [...state.messages, assistantMessage],
    );

    // Prepare messages for API
    final apiMessages = state.messages
        .where((m) => !m.isStreaming || m.id != assistantId)
        .map((m) => ChatMessage(role: m.role, content: m.content))
        .toList();

    try {
      final stream = _client.sendMessage(
        messages: apiMessages,
        uiLanguage: 'rw',
      );

      await for (final chunk in stream) {
        if (chunk.isDone) break;

        if (chunk.error != null) {
          state = state.copyWith(
            error: chunk.error,
            isLoading: false,
            isStreaming: false,
          );
          break;
        }

        // Update message
        final updatedMessages = state.messages.map((m) {
          if (m.id == assistantId) {
            return m.copyWith(
              content: chunk.content != null
                  ? m.content + chunk.content!
                  : m.content,
              toolName: chunk.toolCall ?? m.toolName,
              generatedImage: chunk.generatedImage ?? m.generatedImage,
              generatedVideo: chunk.generatedVideo ?? m.generatedVideo,
              weatherData: chunk.weatherData ?? m.weatherData,
              sources: chunk.sources ?? m.sources,
            );
          }
          return m;
        }).toList();

        state = state.copyWith(messages: updatedMessages);
      }

      // Finalize message
      final finalMessages = state.messages.map((m) {
        if (m.id == assistantId) {
          return m.copyWith(isStreaming: false);
        }
        return m;
      }).toList();

      state = state.copyWith(
        messages: finalMessages,
        isLoading: false,
        isStreaming: false,
      );
    } catch (e) {
      state = state.copyWith(
        error: e.toString(),
        isLoading: false,
        isStreaming: false,
      );
    }
  }

  /// Cancel ongoing stream
  void cancelStream() {
    _client.cancel();
    state = state.copyWith(
      isLoading: false,
      isStreaming: false,
    );
  }

  /// Clear all messages
  void clearMessages() {
    state = ChatState();
  }

  /// Clear error
  void clearError() {
    state = state.copyWith(error: null);
  }

  @override
  void dispose() {
    _client.dispose();
    super.dispose();
  }
}

// Chat provider
final chatProvider = StateNotifierProvider<ChatNotifier, ChatState>((ref) {
  final client = ref.watch(sseClientProvider);
  return ChatNotifier(client);
});
