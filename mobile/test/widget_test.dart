/// Bakame AI Widget Tests
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:bakame_mobile/main.dart';

void main() {
  testWidgets('BakameApp renders correctly', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      const ProviderScope(
        child: BakameApp(),
      ),
    );

    // Verify that the app title is displayed
    expect(find.text('Bakame AI'), findsWidgets);
  });
}
