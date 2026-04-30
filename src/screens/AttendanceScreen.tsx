import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { Text, Card, Button, useTheme } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

const AttendanceScreen = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [records, setRecords] = useState<Record<string, string>>({});
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const theme = useTheme();

  const dateStr = date.toISOString().split('T')[0];

  const fetchData = async (selectedDate: string) => {
    try {
      setLoading(true);
      const { data: empData } = await supabase.from('employees').select('emp_code, name').eq('is_active', true).order('emp_code');
      setEmployees(empData || []);
      const { data: logData } = await supabase.from('attendance_logs').select('emp_code, status').eq('date', selectedDate);
      const logMap: Record<string, string> = {};
      logData?.forEach(log => { logMap[log.emp_code] = log.status; });
      setRecords(logMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(dateStr); }, [dateStr]);

  const markAttendance = async (empCode: string, status: string) => {
    try {
      await supabase.from('attendance_logs').upsert({ emp_code: empCode, date: dateStr, status }, { onConflict: 'emp_code, date' });
      setRecords(prev => ({ ...prev, [empCode]: status }));
    } catch (error: any) {
      console.error('Error marking attendance:', error.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.outlineVariant }]}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>Daily Attendance</Text>
        <View style={styles.dateRow}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Select Date: </Text>
          {Platform.OS === 'web' ? (
            <input 
              type="date" 
              value={dateStr} 
              onChange={(e) => setDate(new Date(e.target.value))}
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

      {loading ? (
        <ActivityIndicator animating={true} size="large" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={item => item.emp_code}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const status = records[item.emp_code];
            return (
              <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                <Card.Content style={styles.row}>
                  <View style={styles.info}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>{item.name}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{item.emp_code}</Text>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => markAttendance(item.emp_code, 'PRESENT')} style={[styles.btn, { borderColor: theme.colors.outline }, status === 'PRESENT' && {backgroundColor: '#10B981', borderColor: '#10B981'}]}>
                      <Text style={[styles.btnT, { color: theme.colors.onSurface }, status === 'PRESENT' && {color: '#fff'}]}>P</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => markAttendance(item.emp_code, 'ABSENT')} style={[styles.btn, { borderColor: theme.colors.outline }, status === 'ABSENT' && {backgroundColor: '#EF4444', borderColor: '#EF4444'}]}>
                      <Text style={[styles.btnT, { color: theme.colors.onSurface }, status === 'ABSENT' && {color: '#fff'}]}>A</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => markAttendance(item.emp_code, 'HALF_DAY')} style={[styles.btn, { borderColor: theme.colors.outline }, status === 'HALF_DAY' && {backgroundColor: '#F59E0B', borderColor: '#F59E0B'}]}>
                      <Text style={[styles.btnT, { color: theme.colors.onSurface }, status === 'HALF_DAY' && {color: '#fff'}]}>H</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => markAttendance(item.emp_code, 'OFF')} style={[styles.btn, { borderColor: theme.colors.outline }, status === 'OFF' && {backgroundColor: '#6B7280', borderColor: '#6B7280'}]}>
                      <Text style={[styles.btnT, { color: theme.colors.onSurface }, status === 'OFF' && {color: '#fff'}]}>O</Text>
                    </TouchableOpacity>
                  </View>
                </Card.Content>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, alignItems: 'center', borderBottomWidth: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  webDate: { padding: 8, borderRadius: 5, borderWidth: 2, borderStyle: 'solid', fontSize: 16, fontWeight: 'bold' },
  list: { padding: 15, maxWidth: 800, width: '100%', alignSelf: 'center' },
  card: { marginBottom: 10, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  info: { flex: 1 },
  actions: { flexDirection: 'row' },
  btn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  btnT: { fontWeight: 'bold' }
});

export default AttendanceScreen;
