/// Image Card Widget - Displays generated images
library;

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import '../../../../core/theme/app_theme.dart';

class ImageCard extends StatelessWidget {
  final String imageUrl;
  final String? prompt;
  final int? width;
  final int? height;

  const ImageCard({
    super.key,
    required this.imageUrl,
    this.prompt,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.1),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            CachedNetworkImage(
              imageUrl: imageUrl,
              fit: BoxFit.cover,
              placeholder: (context, url) => _buildPlaceholder(isDark),
              errorWidget: (context, url, error) => _buildError(isDark),
            ),

            // Prompt caption
            if (prompt != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark
                      ? AppColors.darkBackgroundSecondary
                      : AppColors.lightBackgroundSecondary,
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.auto_awesome,
                      size: 16,
                      color: AppColors.primaryGreen,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        prompt!,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark
                              ? AppColors.darkForegroundMuted
                              : AppColors.lightForegroundMuted,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder(bool isDark) {
    return Shimmer.fromColors(
      baseColor: isDark ? Colors.grey[800]! : Colors.grey[300]!,
      highlightColor: isDark ? Colors.grey[700]! : Colors.grey[100]!,
      child: Container(
        height: 200,
        color: Colors.white,
      ),
    );
  }

  Widget _buildError(bool isDark) {
    return Container(
      height: 200,
      color: isDark ? AppColors.darkBackgroundSecondary : AppColors.lightBackgroundSecondary,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.broken_image,
              size: 48,
              color: isDark ? AppColors.darkForegroundMuted : AppColors.lightForegroundMuted,
            ),
            const SizedBox(height: 8),
            Text(
              'Failed to load image',
              style: TextStyle(
                color: isDark ? AppColors.darkForegroundMuted : AppColors.lightForegroundMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
