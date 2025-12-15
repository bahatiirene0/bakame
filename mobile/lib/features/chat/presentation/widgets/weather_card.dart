/// Weather Card Widget - Displays weather data
library;

import 'package:flutter/material.dart';

class WeatherCard extends StatelessWidget {
  final Map<String, dynamic> data;

  const WeatherCard({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final location = data['location'] ?? 'Unknown';
    final temp = data['temperature'] ?? data['temp'] ?? '--';
    final condition = data['condition'] ?? data['description'] ?? 'Unknown';
    final humidity = data['humidity'];
    final wind = data['wind'] ?? data['windSpeed'];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.blue.shade400,
            Colors.blue.shade600,
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Location
          Row(
            children: [
              const Icon(Icons.location_on, color: Colors.white70, size: 16),
              const SizedBox(width: 4),
              Text(
                location,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Temperature
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$temp',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 48,
                  fontWeight: FontWeight.w300,
                  height: 1,
                ),
              ),
              const Text(
                '°C',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 24,
                  fontWeight: FontWeight.w300,
                ),
              ),
              const Spacer(),
              _getWeatherIcon(condition),
            ],
          ),

          // Condition
          Text(
            condition,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 12),

          // Details
          Row(
            children: [
              if (humidity != null) ...[
                const Icon(Icons.water_drop, color: Colors.white70, size: 16),
                const SizedBox(width: 4),
                Text(
                  '$humidity%',
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
                const SizedBox(width: 16),
              ],
              if (wind != null) ...[
                const Icon(Icons.air, color: Colors.white70, size: 16),
                const SizedBox(width: 4),
                Text(
                  '$wind km/h',
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _getWeatherIcon(String condition) {
    final conditionLower = condition.toLowerCase();
    IconData icon;

    if (conditionLower.contains('sun') || conditionLower.contains('clear')) {
      icon = Icons.wb_sunny;
    } else if (conditionLower.contains('cloud')) {
      icon = Icons.cloud;
    } else if (conditionLower.contains('rain')) {
      icon = Icons.water_drop;
    } else if (conditionLower.contains('storm') || conditionLower.contains('thunder')) {
      icon = Icons.thunderstorm;
    } else if (conditionLower.contains('snow')) {
      icon = Icons.ac_unit;
    } else {
      icon = Icons.cloud;
    }

    return Icon(icon, color: Colors.white, size: 48);
  }
}
