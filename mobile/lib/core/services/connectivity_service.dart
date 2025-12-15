/// Connectivity Service - Network status monitoring
library;

import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Connectivity status enum
enum NetworkStatus {
  online,
  offline,
}

/// Connectivity service to monitor network status
class ConnectivityService {
  final Connectivity _connectivity = Connectivity();
  final StreamController<NetworkStatus> _statusController =
      StreamController<NetworkStatus>.broadcast();

  ConnectivityService() {
    _connectivity.onConnectivityChanged.listen(_updateStatus);
    // Check initial status
    checkConnectivity();
  }

  /// Stream of network status changes
  Stream<NetworkStatus> get statusStream => _statusController.stream;

  /// Check current connectivity
  Future<NetworkStatus> checkConnectivity() async {
    final results = await _connectivity.checkConnectivity();
    final status = _getStatusFromResults(results);
    _statusController.add(status);
    return status;
  }

  void _updateStatus(List<ConnectivityResult> results) {
    final status = _getStatusFromResults(results);
    _statusController.add(status);
  }

  NetworkStatus _getStatusFromResults(List<ConnectivityResult> results) {
    if (results.contains(ConnectivityResult.none) || results.isEmpty) {
      return NetworkStatus.offline;
    }
    return NetworkStatus.online;
  }

  void dispose() {
    _statusController.close();
  }
}

/// Provider for connectivity service
final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  final service = ConnectivityService();
  ref.onDispose(() => service.dispose());
  return service;
});

/// Provider for current network status
final networkStatusProvider = StreamProvider<NetworkStatus>((ref) {
  final service = ref.watch(connectivityServiceProvider);
  return service.statusStream;
});

/// Provider for checking if currently online
final isOnlineProvider = Provider<bool>((ref) {
  final status = ref.watch(networkStatusProvider);
  return status.when(
    data: (s) => s == NetworkStatus.online,
    loading: () => true, // Assume online while loading
    error: (_, __) => false,
  );
});
