import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactElement } from 'react';

import { AuthProvider, AuthRouterShell } from '@/contexts/AuthProvider';
import { robotWebSocket } from '@/lib/websocket';

export default function RootLayout(): ReactElement {
  useEffect(() => {
    robotWebSocket.connect();
    return () => robotWebSocket.disconnect();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AuthRouterShell>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthRouterShell>
    </AuthProvider>
  );
}
