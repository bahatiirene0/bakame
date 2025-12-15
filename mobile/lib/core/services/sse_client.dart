/// SSE (Server-Sent Events) Client for Streaming Chat
///
/// Connects to the Next.js backend and streams AI responses
library;

import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';

/// Represents a chunk of streamed response
class StreamChunk {
  final String? content;
  final String? error;
  final String? toolCall;
  final Map<String, dynamic>? generatedImage;
  final Map<String, dynamic>? generatedVideo;
  final Map<String, dynamic>? weatherData;
  final List<dynamic>? sources;
  final bool isDone;

  StreamChunk({
    this.content,
    this.error,
    this.toolCall,
    this.generatedImage,
    this.generatedVideo,
    this.weatherData,
    this.sources,
    this.isDone = false,
  });

  factory StreamChunk.fromJson(Map<String, dynamic> json) {
    return StreamChunk(
      content: json['content'] as String?,
      error: json['error'] as String?,
      toolCall: json['toolCall'] as String?,
      generatedImage: json['generatedImage'] as Map<String, dynamic>?,
      generatedVideo: json['generatedVideo'] as Map<String, dynamic>?,
      weatherData: json['weatherData'] as Map<String, dynamic>?,
      sources: json['sources'] as List<dynamic>?,
    );
  }

  factory StreamChunk.done() => StreamChunk(isDone: true);
  factory StreamChunk.withError(String error) => StreamChunk(error: error);
}

/// Message format for API
class ChatMessage {
  final String role;
  final String content;

  ChatMessage({required this.role, required this.content});

  Map<String, String> toJson() => {'role': role, 'content': content};
}

/// SSE Client with retry logic
class SSEChatClient {
  final String baseUrl;
  final String? authToken;
  final int maxRetries;
  final Duration retryDelay;

  http.Client? _client;
  StreamController<StreamChunk>? _controller;
  bool _isCancelled = false;

  /// Whether this is a guest user (no auth)
  bool get isGuest => authToken == null;

  SSEChatClient({
    this.baseUrl = ApiConstants.baseUrl,
    this.authToken,
    this.maxRetries = 3,
    this.retryDelay = const Duration(seconds: 2),
  });

  /// Send message and get streaming response
  Stream<StreamChunk> sendMessage({
    required List<ChatMessage> messages,
    String? sessionId,
    Map<String, double>? userLocation,
    String uiLanguage = 'rw',
  }) {
    cancel();
    _isCancelled = false;
    _controller = StreamController<StreamChunk>();
    _client = http.Client();

    _startStreaming(
      messages: messages,
      sessionId: sessionId,
      userLocation: userLocation,
      uiLanguage: uiLanguage,
    );

    return _controller!.stream;
  }

  Future<void> _startStreaming({
    required List<ChatMessage> messages,
    String? sessionId,
    Map<String, double>? userLocation,
    required String uiLanguage,
  }) async {
    int retryCount = 0;

    while (retryCount <= maxRetries && !_isCancelled) {
      try {
        final request = http.Request(
          'POST',
          Uri.parse('$baseUrl${ApiConstants.chatEndpoint}'),
        );

        // Headers
        request.headers['Content-Type'] = 'application/json';
        request.headers['Accept'] = 'text/event-stream';
        if (authToken != null) {
          request.headers['Authorization'] = 'Bearer $authToken';
        }

        // Body - always include isGuest flag
        final body = <String, dynamic>{
          'messages': messages.map((m) => m.toJson()).toList(),
          'sessionId': sessionId,
          'userLocation': userLocation,
          'uiLanguage': uiLanguage,
          'isGuest': isGuest, // Always send this flag
        };
        request.body = jsonEncode(body);

        // Log request for debugging
        debugPrint('SSE Request: ${request.url}');
        debugPrint('SSE Body: ${request.body}');
        debugPrint('SSE isGuest: $isGuest');

        // Send request
        final response = await _client!.send(request);

        debugPrint('SSE Response status: ${response.statusCode}');

        if (response.statusCode != 200) {
          // Try to read error body
          String errorMsg = 'HTTP ${response.statusCode}';
          try {
            final errorBody = await response.stream.bytesToString();
            debugPrint('SSE Error body: $errorBody');
            final errorJson = jsonDecode(errorBody);
            if (errorJson is Map && errorJson['error'] != null) {
              errorMsg = errorJson['error'].toString();
            }
          } catch (_) {
            // Couldn't parse error body, use default
          }

          // Map common HTTP errors to user-friendly messages
          if (response.statusCode == 401) {
            errorMsg = 'Authentication failed. Please sign in again.';
          } else if (response.statusCode == 429) {
            errorMsg = 'Too many requests. Please wait a moment.';
          } else if (response.statusCode >= 500) {
            errorMsg = 'Server error. Please try again later.';
          }

          throw Exception(errorMsg);
        }

        // Process SSE stream
        String buffer = '';
        await for (final chunk in response.stream.transform(utf8.decoder)) {
          if (_isCancelled) break;

          buffer += chunk;
          final lines = buffer.split('\n');
          buffer = lines.last;

          for (int i = 0; i < lines.length - 1; i++) {
            final line = lines[i].trim();
            if (line.startsWith('data: ')) {
              final data = line.substring(6);

              if (data == '[DONE]') {
                _controller?.add(StreamChunk.done());
                _controller?.close();
                return;
              }

              try {
                final json = jsonDecode(data) as Map<String, dynamic>;
                _controller?.add(StreamChunk.fromJson(json));
              } catch (e) {
                debugPrint('SSE parse error: $e');
              }
            }
          }
        }

        // Stream ended normally
        _controller?.close();
        return;

      } catch (e) {
        retryCount++;

        if (_isCancelled) {
          _controller?.close();
          return;
        }

        if (retryCount > maxRetries) {
          _controller?.add(StreamChunk.withError('Connection failed after $maxRetries retries'));
          _controller?.close();
          return;
        }

        if (_isRetryable(e)) {
          debugPrint('Retry $retryCount/$maxRetries after ${retryDelay.inSeconds}s');
          await Future.delayed(retryDelay * retryCount);
        } else {
          _controller?.add(StreamChunk.withError(e.toString()));
          _controller?.close();
          return;
        }
      }
    }
  }

  bool _isRetryable(dynamic error) {
    final errorStr = error.toString().toLowerCase();
    return errorStr.contains('timeout') ||
           errorStr.contains('connection') ||
           errorStr.contains('network') ||
           errorStr.contains('503') ||
           errorStr.contains('502');
  }

  /// Cancel ongoing stream
  void cancel() {
    _isCancelled = true;
    _client?.close();
    _client = null;
    if (_controller != null && !_controller!.isClosed) {
      _controller?.close();
    }
    _controller = null;
  }

  void dispose() => cancel();
}
