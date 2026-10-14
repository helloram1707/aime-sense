import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StatusBar, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

import { useI18n } from '@/src/i18n/I18nContext';

export default function TabLayout() {
  const colors = useColors();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarLabelPosition: 'below-icon',
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: Platform.OS === 'web' ? 76 : 64 + insets.bottom,
            paddingTop: 7,
            paddingBottom: Platform.OS === 'web' ? 8 : Math.max(insets.bottom, 7),
          },
          tabBarLabelStyle: {
            fontFamily: 'Inter_600SemiBold',
            fontSize: 10,
            lineHeight: 12,
            marginTop: 1,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t.tabOverview,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="view-dashboard-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="monitor"
          options={{
            title: t.tabMonitor,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-bell-curve-cumulative" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="lab"
          options={{
            title: t.tabLab,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="flask-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: t.tabHistory,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="history" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="guide"
          options={{ href: null, title: t.tabGuide }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t.tabProfile,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-circle-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
