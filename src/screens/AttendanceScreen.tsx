import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { Text, Card, Avatar, Button, Divider } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

const AttendanceScreen = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [records, setRecords] = useState<Record<string, string>>({});
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

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
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.blackText}>Daily Attendance</Text>
        <View style={styles.dateRow}>
          <Text variant="bodyLarge" style={styles.blackText}>Select Date: </Text>
          {Platform.OS === 'web' ? (
            <input 
              type="date" 
              value={dateStr} 
              onChange={(e) => setDate(new Date(e.target.value))}
              style={styles.webDate}
            />
          ) : (
            <Button mode="outlined" textColor="#000" onPress={() => setShowPicker(true)}>{dateStr}</Button>
          )}
          {showPicker && <DateTimePicker value={date} mode="date" onChange={(e, d) => { setShowPicker(false); if(d) setDate(d); }} />}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator animating={true} size="large" color="#000" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={item => item.emp_code}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const status = records[item.emp_code];
            return (
              <Card style={styles.card}>
                <Card.Content style={styles.row}>
                  <View style={styles.info}>
                    <Text variant="titleMedium" style={[styles.blackText, { fontWeight: 'bold' }]}>{item.name}</Text>
                    <Text variant="bodySmall" style={styles.blackText}>{item.emp_code}</Text>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => markAttendance(item.emp_code, 'PRESENT')} style={[styles.btn, status === 'PRESENT' && {backgroundColor: '#10B981', borderColor: '#10B981'}]}>
                      <Text style={[styles.btnT, status === 'PRESENT' && {color: '#fff'}]}>P</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => markAttendance(item.emp_code, 'ABSENT')} style={[styles.btn, status === 'ABSENT' && {backgroundColor: '#EF4444', borderColor: '#EF4444'}]}>
                      <Text style={[styles.btnT, status === 'ABSENT' && {color: '#fff'}]}>A</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => markAttendance(item.emp_code, 'HALF_DAY')} style={[styles.btn, status === 'HALF_DAY' && {backgroundColor: '#F59E0B', borderColor: '#F59E0B'}]}>
                      <Text style={[styles.btnT, status === 'HALF_DAY' && {color: '#fff'}]}>H</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => markAttendance(item.emp_code, 'OFF')} style={[styles.btn, status === 'OFF' && {backgroundColor: '#6B7280', borderColor: '#6B7280'}]}>
                      <Text style={[styles.btnT, status === 'OFF' && {color: '#fff'}]}>O</Text>
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, backgroundColor: '#fff', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#000' },
  blackText: { color: '#000' },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  webDate: { padding: 8, borderRadius: 5, borderWidth: 2, borderColor: '#000', borderStyle: 'solid', fontSize: 16, color: '#000', fontWeight: 'bold' },
  list: { padding: 15, maxWidth: 800, width: '100%', alignSelf: 'center' },
  card: { marginBottom: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  info: { flex: 1 },
  actions: { flexDirection: 'row' },
  btn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#000', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  btnT: { fontWeight: 'bold', color: '#000' }
});

export default AttendanceScreen;
