import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors, Tint } from '@/constants/theme';
import { AuthProvider } from '@/contexts/auth';
import { ChatProvider } from '@/contexts/chat';
import { DrawerProvider } from '@/contexts/drawer';
import '@/lib/i18n';
import { queryClient } from '@/lib/queryClient';

void SplashScreen.preventAutoHideAsync();

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.violet,
    background: Colors.lilac,
    card: Colors.lilac,
    text: Colors.plum,
    border: Tint.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard-Regular': require('../assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-SemiBold': require('../assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('../assets/fonts/Pretendard-Bold.otf'),
  });

  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ChatProvider>
            <DrawerProvider>
              <ThemeProvider value={AppTheme}>
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: Colors.lilac },
                  }}
                >
                  <Stack.Screen name="login" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="signup" options={{ presentation: 'modal' }} />
                </Stack>
              </ThemeProvider>
            </DrawerProvider>
          </ChatProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
