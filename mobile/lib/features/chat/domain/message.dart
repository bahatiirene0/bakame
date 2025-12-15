/// Message Model for Chat
library;

class Message {
  final String id;
  final String role; // 'user' or 'assistant'
  final String content;
  final DateTime timestamp;
  final bool isStreaming;
  final String? toolName;
  final Map<String, dynamic>? generatedImage;
  final Map<String, dynamic>? generatedVideo;
  final Map<String, dynamic>? weatherData;
  final List<dynamic>? sources;
  final List<Map<String, dynamic>>? attachments;

  Message({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
    this.isStreaming = false,
    this.toolName,
    this.generatedImage,
    this.generatedVideo,
    this.weatherData,
    this.sources,
    this.attachments,
  });

  bool get isUser => role == 'user';
  bool get isAssistant => role == 'assistant';

  Message copyWith({
    String? content,
    bool? isStreaming,
    String? toolName,
    Map<String, dynamic>? generatedImage,
    Map<String, dynamic>? generatedVideo,
    Map<String, dynamic>? weatherData,
    List<dynamic>? sources,
  }) {
    return Message(
      id: id,
      role: role,
      content: content ?? this.content,
      timestamp: timestamp,
      isStreaming: isStreaming ?? this.isStreaming,
      toolName: toolName ?? this.toolName,
      generatedImage: generatedImage ?? this.generatedImage,
      generatedVideo: generatedVideo ?? this.generatedVideo,
      weatherData: weatherData ?? this.weatherData,
      sources: sources ?? this.sources,
      attachments: attachments,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'role': role,
    'content': content,
    'timestamp': timestamp.toIso8601String(),
  };

  factory Message.fromJson(Map<String, dynamic> json) => Message(
    id: json['id'] as String,
    role: json['role'] as String,
    content: json['content'] as String,
    timestamp: DateTime.parse(json['timestamp'] as String),
  );
}

class ChatSession {
  final String id;
  final String title;
  final List<Message> messages;
  final DateTime createdAt;
  final DateTime updatedAt;

  ChatSession({
    required this.id,
    required this.title,
    required this.messages,
    required this.createdAt,
    required this.updatedAt,
  });

  ChatSession copyWith({
    String? title,
    List<Message>? messages,
    DateTime? updatedAt,
  }) {
    return ChatSession(
      id: id,
      title: title ?? this.title,
      messages: messages ?? this.messages,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
