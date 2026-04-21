import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ActivityIndicator, Platform } from 'react-native';
import { Text, TextInput, Button, Card, FAB, Portal, Dialog, Avatar } from 'react-native-paper';
import { supabase } from '../lib/supabase';

const ManageEmployeesScreen = () => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);
  
  const [empName, setEmpName] = useState('');
  const [empCode, setEmpCode] = useState('');

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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: '#000' }}>Manage Roster</Text>
      </View>

      <FlatList
        data={employees}
        keyExtractor={item => item.emp_code}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Title 
              title={item.name} 
              titleStyle={{ color: '#000', fontWeight: 'bold' }}
              subtitle={item.emp_code}
              subtitleStyle={{ color: '#000' }}
              right={() => (
                <View style={{ flexDirection: 'row', paddingRight: 10 }}>
                  <Button mode="text" textColor="#000" compact onPress={() => { setEditingEmp(item); setEmpName(item.name); setEmpCode(item.emp_code); setVisible(true); }}>Edit</Button>
                  <Button mode="text" textColor="red" compact onPress={() => handleDelete(item.emp_code)}>Remove</Button>
                </View>
              )}
            />
          </Card>
        )}
      />

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)} style={{ backgroundColor: '#fff', borderBotomWidth: 4, borderBottomColor: '#000' }}>
          <Dialog.Title style={{ color: '#000', fontWeight: 'bold' }}>{editingEmp ? 'Edit Employee' : 'Add Employee'}</Dialog.Title>
          <Dialog.Content>
            <TextInput 
                label="Name" 
                value={empName} 
                onChangeText={setEmpName} 
                style={{ marginBottom: 10, backgroundColor: '#fff' }} 
                textColor="#000"
                outlineColor="#000"
                activeOutlineColor="#000"
                mode="outlined"
            />
            <TextInput 
                label="Code" 
                value={empCode} 
                onChangeText={setEmpCode} 
                disabled={!!editingEmp} 
                style={{ backgroundColor: '#fff' }}
                textColor="#000"
                outlineColor="#000"
                activeOutlineColor="#000"
                mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)} textColor="#000">Cancel</Button>
            <Button mode="contained" onPress={handleSave} buttonColor="#000" textColor="#fff">Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => { setEditingEmp(null); setEmpName(''); setEmpCode(''); setVisible(true); }}
        label="Add New"
        color="#fff"
      />
      {loading && !visible && <ActivityIndicator color="#000" style={styles.loader} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: '#000' },
  list: { padding: 15, maxWidth: 800, width: '100%', alignSelf: 'center' },
  card: { marginBottom: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#000' },
  fab: { position: 'absolute', margin: 20, right: 0, bottom: 0, backgroundColor: '#000' },
  loader: { position: 'absolute', top: '50%', left: '50%' }
});

export default ManageEmployeesScreen;
