import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ActivityIndicator, Platform } from 'react-native';
import { Text, TextInput, Button, Card, FAB, Portal, Dialog, useTheme } from 'react-native-paper';
import { supabase } from '../lib/supabase';

const ManageEmployeesScreen = () => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);
  
  const [empName, setEmpName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const theme = useTheme();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data } = await supabase.from('employees').select('*').eq('is_active', true).order('emp_code');
      setEmployees(data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const handleSave = async () => {
    if (!empName || !empCode) { Alert.alert('Error', 'Fill all fields'); return; }
    try {
      setLoading(true);
      await supabase.from('employees').upsert({ emp_code: empCode, name: empName, is_active: true });
      setVisible(false);
      setEditingEmp(null);
      fetchEmployees();
    } finally { setLoading(false); }
  };

  const handleDelete = async (code: string) => {
    const performDelete = async () => {
      try {
        setLoading(true);
        const { error } = await supabase.from('employees').update({ is_active: false }).eq('emp_code', code);
        if (error) throw error;
        fetchEmployees();
      } catch (error: any) {
        if (Platform.OS === 'web') {
          alert('Error: ' + error.message);
        } else {
          Alert.alert('Error', error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Remove this employee?')) {
        performDelete();
      }
    } else {
      Alert.alert('Confirm', 'Remove this employee?', [
        { text: 'Cancel' },
        { text: 'Remove', onPress: performDelete }
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.outlineVariant }]}>
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.onBackground }}>Manage Roster</Text>
      </View>

      <FlatList
        data={employees}
        keyExtractor={item => item.emp_code}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
            <Card.Title 
              title={item.name} 
              titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold' }}
              subtitle={item.emp_code}
              subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => (
                <View style={{ flexDirection: 'row', paddingRight: 10 }}>
                  <Button mode="text" compact onPress={() => { setEditingEmp(item); setEmpName(item.name); setEmpCode(item.emp_code); setVisible(true); }}>Edit</Button>
                  <Button mode="text" textColor={theme.colors.error} compact onPress={() => handleDelete(item.emp_code)}>Remove</Button>
                </View>
              )}
            />
          </Card>
        )}
      />

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>{editingEmp ? 'Edit Employee' : 'Add Employee'}</Dialog.Title>
          <Dialog.Content>
            <TextInput 
                label="Name" 
                value={empName} 
                onChangeText={setEmpName} 
                style={{ marginBottom: 10 }} 
                mode="outlined"
            />
            <TextInput 
                label="Code" 
                value={empCode} 
                onChangeText={setEmpCode} 
                disabled={!!editingEmp} 
                mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSave}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => { setEditingEmp(null); setEmpName(''); setEmpCode(''); setVisible(true); }}
        label="Add New"
        color={theme.colors.onPrimary}
      />
      {loading && !visible && <ActivityIndicator size="large" style={styles.loader} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 2 },
  list: { padding: 15, maxWidth: 800, width: '100%', alignSelf: 'center' },
  card: { marginBottom: 10, borderWidth: 1 },
  fab: { position: 'absolute', margin: 20, right: 0, bottom: 0 },
  loader: { position: 'absolute', top: '50%', left: '50%' }
});

export default ManageEmployeesScreen;
