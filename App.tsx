import React from 'react';
import { useColorScheme } from 'react-native';
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { 
  PaperProvider, 
  MD3DarkTheme, 
  MD3LightTheme, 
  adaptNavigationTheme 
} from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import ManageEmployeesScreen from './src/screens/ManageEmployeesScreen';
import DailySummaryScreen from './src/screens/DailySummaryScreen';
import PermissionsScreen from './src/screens/PermissionsScreen';

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

const CombinedDefaultTheme = {
  ...MD3LightTheme,
  version: 3,
  colors: {
    ...MD3LightTheme.colors,
    ...LightTheme.colors,
    primary: '#4F46E5',
  },
};

const CombinedDarkTheme = {
  ...MD3DarkTheme,
  version: 3,
  colors: {
    ...MD3DarkTheme.colors,
    ...DarkTheme.colors,
    primary: '#6366F1',
  },
};

const Stack = createNativeStackNavigator();

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? CombinedDarkTheme : CombinedDefaultTheme;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer theme={theme}>
          <Stack.Navigator 
            initialRouteName="Home"
            screenOptions={{
              headerStyle: { backgroundColor: theme.colors.primary },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: '700' },
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Admin Dashboard' }} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Mark Attendance' }} />
            <Stack.Screen name="DailySummary" component={DailySummaryScreen} options={{ title: 'Today\'s Summary' }} />
            <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: 'Employee Reports' }} />
            <Stack.Screen name="ManageEmployees" component={ManageEmployeesScreen} options={{ title: 'Manage Roster' }} />
            <Stack.Screen name="Permissions" component={PermissionsScreen} options={{ title: 'Employee Permissions' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
