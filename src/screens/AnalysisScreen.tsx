import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, FlatList, ActivityIndicator } from 'react-native';
import { Text, Button, Card, Searchbar, Avatar } from 'react-native-paper';
import { supabase } from '../lib/supabase';

const AnalysisScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, halfDay: 0, off: 0, unpaid: 0 });
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
      const startDate = new Date(selectedYear, selectedMonth - 1, 26).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth, 25).toISOString().split('T')[0];
      const { data } = await supabase.from('attendance_logs').select('*').eq('emp_code', emp.emp_code).gte('date', startDate).lte('date', endDate).order('date', { ascending: false });
      setHistory(data || []);
      const counts = (data || []).reduce((acc: any, curr: any) => {
        if (curr.status === 'PRESENT') acc.present++;
        else if (curr.status === 'ABSENT') acc.absent++;
        else if (curr.status === 'HALF_DAY') acc.halfDay++;
        else if (curr.status === 'OFF') acc.off++;
        return acc;
      }, { present: 0, absent: 0, halfDay: 0, off: 0 });

      // Logic: If absents > 2, the rest are non-paid leaves
      const unpaid = Math.max(0, counts.absent - 2);
      setStats({ ...counts, unpaid });
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      {selectedEmployee ? (
        <View style={{ flex: 1 }}>
          <View style={styles.detailHeader}>
            <Button mode="text" textColor="#000" icon="arrow-left" onPress={() => setSelectedEmployee(null)}>Back</Button>
            <View style={styles.pickerRow}>
              <Button mode="outlined" textColor="#000" compact={true} onPress={() => setSelectedMonth((selectedMonth + 11) % 12)}>Prev</Button>
              <Text variant="titleMedium" style={[styles.blackText, styles.monthText]}>{months[selectedMonth]} {selectedYear}</Text>
              <Button mode="outlined" textColor="#000" compact={true} onPress={() => setSelectedMonth((selectedMonth + 1) % 12)}>Next</Button>
            </View>
          </View>

          <ScrollView style={styles.scrollContent}>
            <Card style={styles.profileCard}>
              <Card.Content style={styles.center}>
                <Avatar.Text size={64} label={selectedEmployee.name.substring(0,2).toUpperCase()} backgroundColor="#000" color="#fff" />
                <Text variant="headlineSmall" style={[styles.blackText, { fontWeight: 'bold', marginTop: 10 }]}>{selectedEmployee.name}</Text>
                <Text variant="labelLarge" style={[styles.blackText, styles.cycleBadge]}>Cycle: 26 {months[(selectedMonth + 11) % 12]} - 25 {months[selectedMonth]}</Text>
                
                <View style={styles.statsRow}>
                  <View style={styles.statItem}><Text variant="headlineMedium" style={{ color: '#10B981', fontWeight: 'bold' }}>{stats.present}</Text><Text style={styles.blackText}>Presents</Text></View>
                  <View style={styles.statItem}><Text variant="headlineMedium" style={{ color: '#F59E0B', fontWeight: 'bold' }}>{stats.halfDay}</Text><Text style={styles.blackText}>Half-Days</Text></View>
                  <View style={styles.statItem}><Text variant="headlineMedium" style={{ color: '#6B7280', fontWeight: 'bold' }}>{stats.off}</Text><Text style={styles.blackText}>Offs</Text></View>
                </View>
                <View style={[styles.statsRow, { marginTop: 10 }]}>
                  <View style={styles.statItem}><Text variant="headlineMedium" style={{ color: '#EF4444', fontWeight: 'bold' }}>{stats.absent}</Text><Text style={styles.blackText}>Absents</Text></View>
                  <View style={styles.statItem}><Text variant="headlineMedium" style={{ color: '#991B1B', fontWeight: 'bold' }}>{stats.unpaid}</Text><Text style={styles.blackText}>Non-Paid</Text></View>
                </View>
              </Card.Content>
            </Card>

            <Text variant="titleLarge" style={[styles.blackText, { marginBottom: 10, fontWeight: 'bold' }]}>Cycle Records</Text>
            {history.map(item => (
              <View key={item.id} style={styles.historyRow}>
                <Text style={styles.blackText}>{item.date}</Text>
                <Text style={[styles.blackText, { fontWeight: 'bold' }]}>{item.status}</Text>
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
            style={styles.search}
            inputStyle={{ color: '#000' }}
          />
          <FlatList
            data={filteredEmployees}
            keyExtractor={item => item.emp_code}
            renderItem={({ item }) => (
              <Card style={styles.listCard} onPress={() => setSelectedEmployee(item)}>
                <Card.Title 
                    title={item.name} 
                    titleStyle={styles.blackText}
                    subtitle={item.emp_code}
                    subtitleStyle={styles.blackText}
                    right={() => <Button icon="chevron-right" textColor="#000" onPress={() => setSelectedEmployee(item)} />} 
                />
              </Card>
            )}
          />
        </View>
      )}
      {loading && <ActivityIndicator animating={true} color="#000" style={styles.loader} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  blackText: { color: '#000' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: '#000' },
  pickerRow: { flexDirection: 'row', alignItems: 'center' },
  monthText: { marginHorizontal: 15, fontWeight: 'bold' },
  scrollContent: { padding: 20, maxWidth: 900, alignSelf: 'center', width: '100%' },
  profileCard: { borderRadius: 15, backgroundColor: '#fff', marginBottom: 25, borderWidth: 2, borderColor: '#000' },
  center: { alignItems: 'center', paddingVertical: 20 },
  cycleBadge: { marginTop: 5, backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 20 },
  statItem: { alignItems: 'center' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff', marginBottom: 5, borderRadius: 10, borderWidth: 1, borderColor: '#000' },
  listContainer: { padding: 20, flex: 1, maxWidth: 800, alignSelf: 'center', width: '100%' },
  search: { marginBottom: 20, backgroundColor: '#fff', borderWidth: 2, borderColor: '#000' },
  listCard: { marginBottom: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },
  loader: { position: 'absolute', top: '50%', left: '50%' }
});

export default AnalysisScreen;
