import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ActivityIndicator, Platform, TextInput, TouchableOpacity } from 'react-native';
import { Text, Card, Button, useTheme, Avatar } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import EmployeeProfileModal from '../components/EmployeeProfileModal';

interface TimeRecord {
  permH: string;
  permM: string;
  lateH: string;
  lateM: string;
}

const PermissionsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [records, setRecords] = useState<Record<string, TimeRecord>>({});
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

  const splitHours = (decimalHours: number | null) => {
    if (decimalHours == null) return { h: '0', m: '0' };
    const totalMinutes = Math.round(decimalHours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return { h: h.toString(), m: m.toString() };
  };

  const combineToHours = (h: string, m: string) => {
    const hours = parseInt(h) || 0;
    const mins = parseInt(m) || 0;
    return hours + (mins / 60);
  };

  const fetchData = async (selectedDate: string) => {
    try {
      setLoading(true);
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('emp_code');
      
      if (empError) throw empError;
      setEmployees(empData || []);

      const { data: logData, error: logError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('date', selectedDate);
      
      if (logError) throw logError;

      const map: Record<string, TimeRecord> = {};
      logData?.forEach(log => { 
        const perm = splitHours(log.permission_hours);
        const late = splitHours(log.late_hours);
        map[log.emp_code] = {
            permH: perm.h,
            permM: perm.m,
            lateH: late.h,
            lateM: late.m
        }; 
      });
      setRecords(map);
    } catch (error: any) {
      console.error('Fetch Error:', error);
      Alert.alert('Error', 'Failed to fetch data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(dateStr); }, [dateStr]);

  const saveRecord = async (empCode: string) => {
    const current = records[empCode] || { permH: '0', permM: '0', lateH: '0', lateM: '0' };
    
    try {
      const payload = {
        emp_code: empCode,
        date: dateStr,
        permission_hours: combineToHours(current.permH, current.permM),
        late_hours: combineToHours(current.lateH, current.lateM)
      };

      const { error } = await supabase
        .from('attendance_logs')
        .upsert(payload, { onConflict: 'emp_code, date' });

      if (error) throw error;
    } catch (error: any) {
      console.error('Save Error:', error);
      Alert.alert('Save Error', error.message);
    }
  };

  const updateState = (empCode: string, field: keyof TimeRecord, value: string) => {
    // Sanitize value to numbers only
    const sanitized = value.replace(/[^0-9]/g, '');
    setRecords(prev => ({
        ...prev,
        [empCode]: {
            ...(prev[empCode] || { permH: '0', permM: '0', lateH: '0', lateM: '0' }),
            [field]: sanitized
        }
    }));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.outlineVariant }]}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>Late & Permissions</Text>
        <View style={styles.dateRow}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Date: </Text>
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

      {loading ? (
        <View style={styles.center}><ActivityIndicator animating={true} size="large" /></View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={item => item.emp_code}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold', fontSize: 16 }}>No active employees found.</Text>
                <Button mode="contained" onPress={() => fetchData(dateStr)} style={{marginTop: 10}}>Retry Fetch</Button>
            </View>
          }
          renderItem={({ item }) => {
            const data = records[item.emp_code] || { permH: '0', permM: '0', lateH: '0', lateM: '0' };
            return (
              <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                <Card.Content style={styles.row}>
                  <View style={styles.infoRow}>
                    <TouchableOpacity onPress={() => { setSelectedProfile(item); setProfileVisible(true); }} style={{ marginRight: 12 }}>
                      {item.avatar_url ? (
                        <Avatar.Image size={40} source={{ uri: item.avatar_url }} />
                      ) : (
                        <Avatar.Text size={40} label={item.name.substring(0, 2).toUpperCase()} />
                      )}
                    </TouchableOpacity>
                    <View style={styles.info}>
                      <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>{item.name}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{item.emp_code}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.inputsRow}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>Late</Text>
                        <View style={styles.timeInputs}>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
                                <TextInput
                                    style={[styles.input, { color: theme.colors.onSurface }]}
                                    value={data.lateH}
                                    keyboardType="numeric"
                                    onChangeText={(val) => updateState(item.emp_code, 'lateH', val)}
                                    onBlur={() => saveRecord(item.emp_code)}
                                    placeholder="0"
                                    placeholderTextColor={theme.colors.onSurfaceVariant}
                                />
                                <Text style={[styles.unit, { color: theme.colors.onSurfaceVariant }]}>h</Text>
                            </View>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline, marginLeft: 4 }]}>
                                <TextInput
                                    style={[styles.input, { color: theme.colors.onSurface }]}
                                    value={data.lateM}
                                    keyboardType="numeric"
                                    onChangeText={(val) => updateState(item.emp_code, 'lateM', val)}
                                    onBlur={() => saveRecord(item.emp_code)}
                                    placeholder="0"
                                    placeholderTextColor={theme.colors.onSurfaceVariant}
                                />
                                <Text style={[styles.unit, { color: theme.colors.onSurfaceVariant }]}>m</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: theme.colors.onSurfaceVariant }]}>Perm</Text>
                        <View style={styles.timeInputs}>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}>
                                <TextInput
                                    style={[styles.input, { color: theme.colors.onSurface }]}
                                    value={data.permH}
                                    keyboardType="numeric"
                                    onChangeText={(val) => updateState(item.emp_code, 'permH', val)}
                                    onBlur={() => saveRecord(item.emp_code)}
                                    placeholder="0"
                                    placeholderTextColor={theme.colors.onSurfaceVariant}
                                />
                                <Text style={[styles.unit, { color: theme.colors.onSurfaceVariant }]}>h</Text>
                            </View>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline, marginLeft: 4 }]}>
                                <TextInput
                                    style={[styles.input, { color: theme.colors.onSurface }]}
                                    value={data.permM}
                                    keyboardType="numeric"
                                    onChangeText={(val) => updateState(item.emp_code, 'permM', val)}
                                    onBlur={() => saveRecord(item.emp_code)}
                                    placeholder="0"
                                    placeholderTextColor={theme.colors.onSurfaceVariant}
                                />
                                <Text style={[styles.unit, { color: theme.colors.onSurfaceVariant }]}>m</Text>
                            </View>
                        </View>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            );
          }}
        />
      )}

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
  header: { padding: 20, alignItems: 'center', borderBottomWidth: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  webDate: { padding: 8, borderRadius: 5, borderWidth: 2, borderStyle: 'solid', fontSize: 16, fontWeight: 'bold' },
  list: { padding: 15, maxWidth: 800, width: '100%', alignSelf: 'center' },
  card: { marginBottom: 10, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  info: { flex: 1 },
  inputsRow: { flexDirection: 'row' },
  inputGroup: { alignItems: 'center', marginLeft: 15 },
  inputLabel: { fontSize: 10, textTransform: 'uppercase', marginBottom: 2 },
  timeInputs: { flexDirection: 'row' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 6, borderWidth: 1 },
  input: { width: 28, height: 36, textAlign: 'center', fontWeight: 'bold', padding: 0 },
  unit: { fontSize: 11 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center' }
});

export default PermissionsScreen;
