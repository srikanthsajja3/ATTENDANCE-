import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text, Card, Avatar, Divider, List } from 'react-native-paper';
import { supabase } from '../lib/supabase';

const DailySummaryScreen = () => {
  const [loading, setLoading] = useState(true);
  const [absents, setAbsents] = useState<any[]>([]);
  const [offs, setOffs] = useState<any[]>([]);

  const fetchTodaySummary = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
          status,
          employees (
            emp_code,
            name
          )
        `)
        .eq('date', today);

      if (error) throw error;

      const absentList = data?.filter(item => item.status === 'ABSENT') || [];
      const offList = data?.filter(item => item.status === 'OFF') || [];

      setAbsents(absentList);
      setOffs(offList);
    } catch (error) {
      console.error('Error fetching today summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaySummary();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineMedium" style={styles.title}>Today's Summary</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>{new Date().toDateString()}</Text>

      <Card style={styles.sectionCard}>
        <Card.Title 
          title={`Absents (${absents.length})`} 
          titleStyle={{ color: '#EF4444', fontWeight: 'bold' }}
          left={(props) => <Avatar.Icon {...props} icon="account-off" backgroundColor="#FEE2E2" color="#EF4444" />}
        />
        <Divider />
        <Card.Content>
          {absents.length > 0 ? (
            absents.map((item, index) => (
              <List.Item
                key={index}
                title={(item.employees as any)?.name || 'Unknown'}
                description={(item.employees as any)?.emp_code || 'N/A'}
                left={props => <List.Icon {...props} icon="circle-small" />}
                titleStyle={{ color: '#000' }}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No one is absent today.</Text>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard}>
        <Card.Title 
          title={`Offs (${offs.length})`} 
          titleStyle={{ color: '#6B7280', fontWeight: 'bold' }}
          left={(props) => <Avatar.Icon {...props} icon="calendar-remove" backgroundColor="#F3F4F6" color="#6B7280" />}
        />
        <Divider />
        <Card.Content>
          {offs.length > 0 ? (
            offs.map((item, index) => (
              <List.Item
                key={index}
                title={(item.employees as any)?.name || 'Unknown'}
                description={(item.employees as any)?.emp_code || 'N/A'}
                left={props => <List.Icon {...props} icon="circle-small" />}
                titleStyle={{ color: '#000' }}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No one has an off today.</Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, maxWidth: 800, alignSelf: 'center', width: '100%' },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { fontWeight: 'bold', color: '#000' },
  subtitle: { marginBottom: 20, color: '#666' },
  sectionCard: { marginBottom: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' },
  emptyText: { paddingVertical: 20, textAlign: 'center', color: '#999', fontStyle: 'italic' }
});

export default DailySummaryScreen;
