import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { Text, Button, Card, Avatar, Portal, Dialog, useTheme } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { importEmployeesFromExcel } from '../utils/excelUtils';
import { exportAttendanceToExcel } from '../utils/exportUtils';

const HomeScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ employees: 0, logsToday: 0 });
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const { width } = useWindowDimensions();
  const theme = useTheme();

  const isMobile = width < 768;

  const months = [
    { label: 'January', value: 0 },
    { label: 'February', value: 1 },
    { label: 'March', value: 2 },
    { label: 'April', value: 3 },
    { label: 'May', value: 4 },
    { label: 'June', value: 5 },
    { label: 'July', value: 6 },
    { label: 'August', value: 7 },
    { label: 'September', value: 8 },
    { label: 'October', value: 9 },
    { label: 'November', value: 10 },
    { label: 'December', value: 11 },
  ];

  const handleExport = async (monthIndex: number) => {
    setExportDialogVisible(false);
    setLoading(true);
    // Create a date for the 25th of the selected month
    const refDate = new Date(new Date().getFullYear(), monthIndex, 25);
    const result = await exportAttendanceToExcel(refDate);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Export Error', result.message);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { count: empCount } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true);
      const today = new Date().toISOString().split('T')[0];
      const { count: logCount } = await supabase.from('attendance_logs').select('*', { count: 'exact', head: true }).eq('date', today);
      setStats({ employees: empCount || 0, logsToday: logCount || 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchStats);
    return unsubscribe;
  }, [navigation]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.welcomeSection}>
        <Text variant="headlineMedium" style={{ fontWeight: '800', color: theme.colors.onBackground }}>System Overview</Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Welcome back, Administrator</Text>
      </View>
      
      <View style={[styles.statsContainer, isMobile && styles.statsContainerMobile]}>
        <Card style={[styles.statCard, isMobile && styles.statCardMobile, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.center}>
            <Avatar.Icon size={48} icon="account-group" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.onPrimaryContainer} />
            <Text variant="displaySmall" style={[styles.statNum, { color: theme.colors.onSurface }]}>{stats.employees}</Text>
            <Text variant="labelLarge" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Active Employees</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, isMobile && styles.statCardMobile, { borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.center}>
            <Avatar.Icon size={48} icon="calendar-check" style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.onPrimaryContainer} />
            <Text variant="displaySmall" style={[styles.statNum, { color: theme.colors.onSurface }]}>{stats.logsToday}</Text>
            <Text variant="labelLarge" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Logged Today</Text>
          </Card.Content>
        </Card>
      </View>

      <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Quick Actions</Text>
      
      <View style={styles.actionGrid}>
        {[
          { label: 'Attendance', icon: 'clipboard-edit-outline', route: 'Attendance' },
          { label: 'Permissions', icon: 'clock-outline', route: 'Permissions' },
          { label: 'Summary', icon: 'format-list-bulleted', route: 'DailySummary' },
          { label: 'Analysis', icon: 'chart-bar', route: 'Analysis' },
          { label: 'Roster', icon: 'account-cog', route: 'ManageEmployees' },
        ].map((item, index) => (
          <Card key={index} style={[styles.actionCard, { width: isMobile ? '48%' : '32%', borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]} onPress={() => navigation.navigate(item.route)}>
            <Card.Content style={styles.center}>
              <Avatar.Icon size={40} icon={item.icon} style={{ backgroundColor: theme.colors.surfaceVariant }} color={theme.colors.onSurfaceVariant} />
              <Text variant="titleSmall" style={[styles.actionTitle, { color: theme.colors.onSurface }]}>{item.label}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      <View style={[styles.footerActions, isMobile && styles.footerActionsMobile]}>
        <Button 
          mode="contained" 
          icon="file-import"
          onPress={async () => { 
            setLoading(true); 
            const result = await importEmployeesFromExcel(); 
            setLoading(false);
            if (result.success) {
              Alert.alert('Success', `Imported ${result.count} employees and ${result.logsCount} attendance logs.`);
              fetchStats();
            } else {
              Alert.alert('Import Failed', result.message || 'Unknown error');
            }
          }}
          style={[styles.bottomBtn, isMobile && styles.bottomBtnMobile]}
        >
          Import Excel
        </Button>

        <Button 
          mode="contained" 
          icon="file-export"
          onPress={() => setExportDialogVisible(true)}
          style={[styles.bottomBtn, isMobile && styles.bottomBtnMobile]}
        >
          Download Report
        </Button>
      </View>

      <Portal>
        <Dialog visible={exportDialogVisible} onDismiss={() => setExportDialogVisible(false)}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>Select Month for Report</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 15, color: theme.colors.onSurfaceVariant }}>
              Report will calculate from 26th of previous month to 25th of selected month.
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {months.map((m) => (
                <Button 
                  key={m.value} 
                  mode="text" 
                  contentStyle={{ justifyContent: 'flex-start' }}
                  onPress={() => handleExport(m.value)}
                >
                  {m.label}
                </Button>
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setExportDialogVisible(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {loading && <ActivityIndicator animating={true} style={{ marginTop: 30 }} size="large" />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: '4%', width: '100%', maxWidth: 1200, alignSelf: 'center' },
  welcomeSection: { marginBottom: 32 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statsContainerMobile: { flexDirection: 'column', marginBottom: 8 },
  statCard: { 
    flex: 0.48, 
    borderRadius: 16, 
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.12)' },
      default: { elevation: 1 }
    }) as any
  },
  statCardMobile: { width: '100%', marginBottom: 16 },
  center: { alignItems: 'center', paddingVertical: 20 },
  statNum: { fontWeight: '800', marginTop: 12 },
  statLabel: { textTransform: 'uppercase', letterSpacing: 1, fontSize: 12, fontWeight: '700' },
  sectionTitle: { marginBottom: 16, fontWeight: '800' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionCard: { 
    marginBottom: 16, 
    borderRadius: 12, 
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 1px 2px rgba(0,0,0,0.1)' },
      default: { elevation: 1 }
    }) as any
  },
  actionTitle: { marginTop: 12, fontWeight: '700', textAlign: 'center' },
  footerActions: { flexDirection: 'row', marginTop: 20, justifyContent: 'center' },
  footerActionsMobile: { flexDirection: 'column' },
  bottomBtn: { marginHorizontal: 8, borderRadius: 8 },
  bottomBtnMobile: { marginHorizontal: 0, marginBottom: 12 },
});

export default HomeScreen;
