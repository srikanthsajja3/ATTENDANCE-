import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import ManageEmployeesScreen from './src/screens/ManageEmployeesScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Home"
            screenOptions={{
              headerStyle: { backgroundColor: '#4F46E5' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: '700' },
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Admin Dashboard' }} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Mark Attendance' }} />
            <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: 'Employee Reports' }} />
            <Stack.Screen name="ManageEmployees" component={ManageEmployeesScreen} options={{ title: 'Manage Roster' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
