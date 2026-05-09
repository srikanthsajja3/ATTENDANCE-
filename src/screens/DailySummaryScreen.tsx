import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { Text, Card, Avatar, Divider, List, useTheme, Button } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import EmployeeProfileModal from '../components/EmployeeProfileModal';

const DailySummaryScreen = () => {
  const [loading, setLoading] = useState(true);
  const [absents, setAbsents] = useState<any[]>([]);
  const [offs, setOffs] = useState<any[]>([]);
  const [lpEntries, setLpEntries] = useState<any[]>([]);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const [profileVisible, setProfileVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const theme = useTheme();

  // Use local date parts to avoid UTC shifting
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  const formatTime = (decimalHours: number | null) => {
    if (decimalHours == null || decimalHours === 0) return null;
    const totalMinutes = Math.round(decimalHours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const fetchSummary = async (selectedDate: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
          status,
          permission_hours,
          late_hours,
          employees (*)
        `)
        .eq('date', selectedDate);

      if (error) throw error;

      const absentList = data?.filter(item => item.status === 'ABSENT') || [];
      const offList = data?.filter(item => item.status === 'OFF') || [];
      const lpList = data?.filter(item => Number(item.permission_hours) > 0 || Number(item.late_hours) > 0) || [];

      setAbsents(absentList);
      setOffs(offList);
      setLpEntries(lpList);
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(dateStr);
  }, [dateStr]);

  const EmployeeAvatar = ({ employee }: { employee: any }) => {
    if (!employee) return null;
    return (
      <TouchableOpacity onPress={() => { setSelectedProfile(employee); setProfileVisible(true); }} style={{ alignSelf: 'center', marginRight: 15 }}>
        {employee.avatar_url ? (
          <Avatar.Image size={40} source={{ uri: employee.avatar_url }} />
        ) : (
          <Avatar.Text size={40} label={employee.name?.substring(0, 2).toUpperCase() || '??'} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
            {dateStr === todayStr ? "Today's Summary" : "Daily Summary"}
          </Text>
          <View style={styles.dateRow}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Select Date: </Text>
            {Platform.OS === 'web' ? (
              <input 
                type="date" 
                value={dateStr} 
                onChange={(e) => {
                  const [y, m, d] = e.target.value.split('-');
                  setDate(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)));
                }}
                style={{ 
                  ...styles.webDate,
                  backgroundColor: theme.colors.surface, 
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.outline
                }}
              />
            ) : (
              <Button mode="outlined" onPress={() => setShowPicker(true)}>{dateStr}</Button>
            )}
            {showPicker && <DateTimePicker value={date} mode="date" onChange={(e, d) => { setShowPicker(false); if(d) setDate(d); }} />}
          </View>
        </View>

        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {date.toDateString()}
        </Text>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <>
            <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
              <Card.Title 
                title={`Absents (${absents.length})`} 
                titleStyle={{ color: '#EF4444', fontWeight: 'bold' }}
                left={(props) => <Avatar.Icon {...props} icon="account-off" style={{ backgroundColor: theme.dark ? '#452727' : '#FEE2E2' }} color="#EF4444" />}
              />
              <Divider />
              <Card.Content>
                {absents.length > 0 ? (
                  absents.map((item, index) => (
                    <List.Item
                      key={index}
                      title={(item.employees as any)?.name || 'Unknown'}
                      description={(item.employees as any)?.emp_code || 'N/A'}
                      left={() => <EmployeeAvatar employee={item.employees} />}
                      titleStyle={{ color: theme.colors.onSurface, fontSize: 14 }}
                      descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                    />
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No one was absent on this day.</Text>
                )}
              </Card.Content>
            </Card>

            <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
              <Card.Title 
                title={`Late & Permissions (${lpEntries.length})`} 
                titleStyle={{ color: '#8B5CF6', fontWeight: 'bold' }}
                left={(props) => <Avatar.Icon {...props} icon="clock-check" style={{ backgroundColor: theme.dark ? '#2E2A41' : '#F5F3FF' }} color="#8B5CF6" />}
              />
              <Divider />
              <Card.Content>
                {lpEntries.length > 0 ? (
                  lpEntries.map((item, index) => {
                      const desc = [];
                      const lateFormatted = formatTime(item.late_hours);
                      const permFormatted = formatTime(item.permission_hours);
                      if (lateFormatted) desc.push(`Late: ${lateFormatted}`);
                      if (permFormatted) desc.push(`Perm: ${permFormatted}`);
                      return (
                          <List.Item
                              key={index}
                              title={(item.employees as any)?.name || 'Unknown'}
                              description={`${(item.employees as any)?.emp_code || 'N/A'} • ${desc.join(', ')}`}
                              left={() => <EmployeeAvatar employee={item.employees} />}
                              titleStyle={{ color: theme.colors.onSurface, fontSize: 14 }}
                              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                          />
                      );
                  })
                ) : (
                  <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No late or permission entries on this day.</Text>
                )}
              </Card.Content>
            </Card>

            <Card style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
              <Card.Title 
                title={`Offs (${offs.length})`} 
                titleStyle={{ color: theme.colors.onSurfaceVariant, fontWeight: 'bold' }}
                left={(props) => <Avatar.Icon {...props} icon="calendar-remove" style={{ backgroundColor: theme.colors.surfaceVariant }} color={theme.colors.onSurfaceVariant} />}
              />
              <Divider />
              <Card.Content>
                {offs.length > 0 ? (
                  offs.map((item, index) => (
                    <List.Item
                      key={index}
                      title={(item.employees as any)?.name || 'Unknown'}
                      description={(item.employees as any)?.emp_code || 'N/A'}
                      left={() => <EmployeeAvatar employee={item.employees} />}
                      titleStyle={{ color: theme.colors.onSurface, fontSize: 14 }}
                      descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                    />
                  ))
                ) : (
                  <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No one had an off on this day.</Text>
                )}
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>

      <EmployeeProfileModal 
        visible={profileVisible} 
        onDismiss={() => setProfileVisible(false)} 
        employee={selectedProfile} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, maxWidth: 800, alignSelf: 'center', width: '100%' },
  loaderContainer: { paddingVertical: 50, alignItems: 'center' },
  header: { marginBottom: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 10 },
  webDate: { padding: 8, borderRadius: 5, borderWidth: 2, borderStyle: 'solid', fontSize: 16, fontWeight: 'bold' },
  title: { fontWeight: 'bold' },
  subtitle: { marginBottom: 20 },
  sectionCard: { marginBottom: 20, borderWidth: 1 },
  emptyText: { paddingVertical: 20, textAlign: 'center', fontStyle: 'italic' }
});

export default DailySummaryScreen;
