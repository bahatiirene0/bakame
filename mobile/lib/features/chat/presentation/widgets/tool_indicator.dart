/// Tool Loading Indicator - Shows when AI is using a tool
library;

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../../core/theme/app_theme.dart';

class ToolIndicator extends StatelessWidget {
  final String toolName;

  const ToolIndicator({super.key, required this.toolName});

  @override
  Widget build(BuildContext context) {
    final (icon, label, color) = _getToolInfo(toolName);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.2),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
          const SizedBox(width: 10),
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms).scale(begin: const Offset(0.95, 0.95));
  }

  (IconData, String, Color) _getToolInfo(String toolName) {
    switch (toolName.toLowerCase()) {
      case 'web_search':
      case 'search':
        return (Icons.search, 'Searching the web...', AppColors.primaryBlue);
      case 'generate_image':
      case 'image':
        return (Icons.image, 'Generating image...', AppColors.primaryGreen);
      case 'generate_video':
      case 'video':
        return (Icons.videocam, 'Generating video...', AppColors.primaryYellow);
      case 'weather':
      case 'get_weather':
        return (Icons.cloud, 'Checking weather...', Colors.cyan);
      case 'directions':
      case 'get_directions':
        return (Icons.directions, 'Getting directions...', Colors.orange);
      case 'execute_code':
      case 'code':
        return (Icons.code, 'Running code...', Colors.purple);
      default:
        return (Icons.settings, 'Working...', AppColors.primaryGreen);
    }
  }
}
