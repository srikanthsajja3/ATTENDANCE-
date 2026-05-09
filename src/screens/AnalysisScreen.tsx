import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, Button, Card, Searchbar, Avatar, useTheme } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import EmployeeProfileModal from '../components/EmployeeProfileModal';

const AnalysisScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  
  const [profileVisible, setProfileVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const [stats, setStats] = useState({ 
    present: 0, 
    absent: 0, 
    halfDay: 0, 
    off: 0, 
    unpaid: 0, 
    permissionHours: 0,
    lateHours: 0,
    combinedDeduction: 0 
  });
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const theme = useTheme();

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const formatTime = (decimalHours: number | null) => {
    if (decimalHours == null || decimalHours === 0) return '0h';
    const totalMinutes = Math.round(decimalHours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data } = await supabase.from('employees').select('*').eq('is_active', true).order('emp_code');
      setEmployees(data || []);
      setFilteredEmployees(data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchEmployees(); }, []);
  
  useEffect(() => { 
    if (selectedEmployee) {
      fetchEmployeeHistory(selectedEmployee); 
    }
  }, [selectedEmployee, selectedMonth, selectedYear]);

  const fetchEmployeeHistory = async (emp: any) => {
    try {
      setLoading(true);
      const startMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const startYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      
      const startDate = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-26`;
      const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-25`;
      
      const { data } = await supabase.from('attendance_logs').select('*').eq('emp_code', emp.emp_code).gte('date', startDate).lte('date', endDate).order('date', { ascending: false });
      setHistory(data || []);
      
      const counts = (data || []).reduce((acc: any, curr: any) => {
        if (curr.status === 'PRESENT') acc.present++;
        else if (curr.status === 'ABSENT') acc.absent++;
        else if (curr.status === 'HALF_DAY') acc.halfDay++;
        else if (curr.status === 'OFF') acc.off++;
        
        acc.permissionHours += Number(curr.permission_hours || 0);
        acc.lateHours += Number(curr.late_hours || 0);
        return acc;
      }, { present: 0, absent: 0, halfDay: 0, off: 0, permissionHours: 0, lateHours: 0 });

      const totalCombined = counts.permissionHours + counts.lateHours;
      let combinedDeduction = 0;
      if (totalCombined > 8) combinedDeduction = 1.0;
      else if (totalCombined > 4) combinedDeduction = 0.5;

      const unpaid = Math.max(0, counts.absent - 2) + (counts.halfDay * 0.5) + combinedDeduction;
      
      setStats({ 
        ...counts, 
        unpaid, 
        combinedDeduction 
      });
    } finally { setLoading(false); }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {selectedEmployee ? (
        <View style={{ flex: 1 }}>
          <View style={[styles.detailHeader, { borderBottomColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface }]}>
            <Button mode="text" icon="arrow-left" onPress={() => setSelectedEmployee(null)}>Back</Button>
            <View style={styles.pickerRow}>
              <Button mode="outlined" compact={true} onPress={() => setSelectedMonth((selectedMonth + 11) % 12)}>Prev</Button>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginHorizontal: 15, fontWeight: 'bold' }}>{months[selectedMonth]} {selectedYear}</Text>
              <Button mode="outlined" compact={true} onPress={() => setSelectedMonth((selectedMonth + 1) % 12)}>Next</Button>
            </View>
          </View>

          <ScrollView style={styles.scrollContent}>
            <Card style={[styles.profileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
              <Card.Content style={styles.center}>
                <TouchableOpacity onPress={() => { setSelectedProfile(selectedEmployee); setProfileVisible(true); }}>
                  {selectedEmployee.avatar_url ? (
                    <Avatar.Image size={64} source={{ uri: selectedEmployee.avatar_url }} style={{ backgroundColor: theme.colors.primary }} />
                  ) : (
                    <Avatar.Text size={64} label={selectedEmployee.name.substring(0,2).toUpperCase()} style={{ backgroundColor: theme.colors.primary }} color={theme.colors.onPrimary} />
                  )}
                </TouchableOpacity>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginTop: 10 }}>{selectedEmployee.name}</Text>
                <Text variant="labelLarge" style={[styles.cycleBadge, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.onSurfaceVariant }]}>
                    Cycle: 26 {months[selectedMonth === 0 ? 11 : selectedMonth - 1]} - 25 {months[selectedMonth]}
                </Text>
                
                <View style={styles.statsRow}>
                  <View style={styles.statItem}><Text variant="headlineMedium" style={{ color: '#10B981', fontWeight: 'bold' }}>{stats.present}</Text><Text style={{ color: theme.colors.onSurfaceVariant }}>Presents</Text></View>
                  <View style={styles.statItem}><Text variant="headlineMedium" style={{ color: '#F59E0B', fontWeight: 'bold' }}>{stats.halfDay}</Text><Text style={{ color: theme.colors.onSurfaceVariant }}>Half-Days</Text></View>
                  <View style={styles.statItem}><Text variant="headlineMedium" style={{ color: '#6B7280', fontWeight: 'bold' }}>{stats.off}</Text><Text style={{ color: theme.colors.onSurfaceVariant }}>Offs</Text></View>
                </View>
                <View style={[styles.statsRow, { marginTop: 10 }]}>
                  <View style={styles.statItem}><Text variant="headlineMedium" style={{ color: '#8B5CF6', fontWeight: 'bold' }}>{formatTime(stats.permissionHours + stats.lateHours)}</Text><Text style={{ color: theme.colors.onSurfaceVariant }}>Total L/P</Text></View>
                  <View style={styles.statItem}><Text variant="headlineMedium" style={{ color: '#EF4444', fontWeight: 'bold' }}>{stats.absent}</Text><Text style={{ color: theme.colors.onSurfaceVariant }}>Absents</Text></View>
                  <View style={styles.statItem}><Text variant="headlineMedium" style={{ color: theme.dark ? '#FF8A80' : '#991B1B', fontWeight: 'bold' }}>{stats.unpaid}</Text><Text style={{ color: theme.colors.onSurfaceVariant }}>Total Cut</Text></View>
                </View>
                <Text style={{ marginTop: 10, fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                    (Late: {formatTime(stats.lateHours)}, Permission: {formatTime(stats.permissionHours)})
                </Text>
              </Card.Content>
            </Card>

            <Text variant="titleLarge" style={{ color: theme.colors.onBackground, marginBottom: 10, fontWeight: 'bold' }}>Cycle Records</Text>
            {history.map(item => (
              <View key={item.id} style={[styles.historyRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
                <View>
                  <Text style={{ color: theme.colors.onSurface }}>{item.date}</Text>
                  {(item.permission_hours > 0 || item.late_hours > 0) && (
                    <Text style={{ color: '#8B5CF6', fontSize: 12 }}>
                        {item.late_hours > 0 ? `Late: ${formatTime(item.late_hours)} ` : ''}
                        {item.permission_hours > 0 ? `Perm: ${formatTime(item.permission_hours)}` : ''}
                    </Text>
                  )}
                </View>
                <Text style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>{item.status || 'N/A'}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <Searchbar
            placeholder="Search employees..."
            onChangeText={(q) => {
              setSearchQuery(q);
              setFilteredEmployees(employees.filter(e => e.name.toLowerCase().includes(q.toLowerCase())));
            }}
            value={searchQuery}
            style={[styles.search, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
          />
          <FlatList
            data={filteredEmployees}
            keyExtractor={item => item.emp_code}
            renderItem={({ item }) => (
              <Card style={[styles.listCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} onPress={() => setSelectedEmployee(item)}>
                <Card.Title 
                    title={item.name} 
                    titleStyle={{ color: theme.colors.onSurface, fontSize: 14 }}
                    subtitle={item.emp_code}
                    subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
                    left={(props) => (
                      <TouchableOpacity onPress={() => { setSelectedProfile(item); setProfileVisible(true); }}>
                        {item.avatar_url ? (
                          <Avatar.Image {...props} source={{ uri: item.avatar_url }} size={40} />
                        ) : (
                          <Avatar.Text {...props} label={item.name.substring(0, 2).toUpperCase()} size={40} />
                        )}
                      </TouchableOpacity>
                    )}
                    right={() => <Button icon="chevron-right" onPress={() => setSelectedEmployee(item)}>View</Button>} 
                />
              </Card>
            )}
          />
        </View>
      )}

      <EmployeeProfileModal 
        visible={profileVisible} 
        onDismiss={() => setProfileVisible(false)} 
        employee={selectedProfile} 
      />

      {loading && <ActivityIndicator animating={true} style={styles.loader} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 2 },
  pickerRow: { flexDirection: 'row', alignItems: 'center' },
  scrollContent: { padding: 20, maxWidth: 900, alignSelf: 'center', width: '100%' },
  profileCard: { borderRadius: 15, marginBottom: 25, borderWidth: 2 },
  center: { alignItems: 'center', paddingVertical: 20 },
  cycleBadge: { marginTop: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 20 },
  statItem: { alignItems: 'center' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, marginBottom: 5, borderRadius: 10, borderWidth: 1 },
  listContainer: { padding: 20, flex: 1, maxWidth: 800, alignSelf: 'center', width: '100%' },
  search: { marginBottom: 20, borderWidth: 2 },
  listCard: { marginBottom: 10, borderWidth: 1 },
  loader: { position: 'absolute', top: '50%', left: '50%' }
});

export default AnalysisScreen;
