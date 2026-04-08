import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Install global error handlers BEFORE anything else
import { instalarHandlers } from './src/utils/logBuffer';
instalarHandlers();

import RootNavigator from './src/navigation/RootNavigator';
import { ToastProvider } from './src/components/ui/Toast';
import { authStore } from './src/store/authStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const initialize = authStore(s => s.initialize);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initialize().finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#0A1628" />
          <RootNavigator />
        </NavigationContainer>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
