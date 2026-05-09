import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ActivityIndicator, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, FAB, Portal, Dialog, useTheme, Avatar } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import EmployeeProfileModal from '../components/EmployeeProfileModal';

const ManageEmployeesScreen = () => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any>(null);
  
  const [empName, setEmpName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [profileVisible, setProfileVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const theme = useTheme();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data } = await supabase.from('employees').select('*').eq('is_active', true).order('emp_code');
      setEmployees(data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const resetForm = () => {
    setEmpName('');
    setEmpCode('');
    setImageUri(null);
    setPhone('');
    setAddress('');
    setDob('');
    setEmergencyName('');
    setEmergencyPhone('');
    setEditingEmp(null);
  };

  const openEdit = (emp: any) => {
    setEditingEmp(emp);
    setEmpName(emp.name || '');
    setEmpCode(emp.emp_code || '');
    setImageUri(emp.avatar_url || null);
    setPhone(emp.phone || '');
    setAddress(emp.address || '');
    setDob(emp.dob || '');
    setEmergencyName(emp.emergency_contact_name || '');
    setEmergencyPhone(emp.emergency_contact_phone || '');
    setVisible(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (code: string) => {
    if (!imageUri || imageUri.startsWith('http')) return imageUri;

    try {
      const fileName = `${code}_${Date.now()}.jpg`;
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('file', blob, fileName);
      } else {
        // @ts-ignore
        formData.append('file', {
          uri: imageUri,
          name: fileName,
          type: 'image/jpeg',
        });
      }

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, Platform.OS === 'web' ? (formData.get('file') as Blob) : formData);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Upload Error:', error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!empName || !empCode) { Alert.alert('Error', 'Fill all fields'); return; }
    try {
      setLoading(true);
      
      let finalAvatarUrl = imageUri;
      if (imageUri && !imageUri.startsWith('http')) {
        const uploadedUrl = await uploadImage(empCode);
        if (uploadedUrl) finalAvatarUrl = uploadedUrl;
      }

      await supabase.from('employees').upsert({ 
        emp_code: empCode, 
        name: empName, 
        is_active: true,
        avatar_url: finalAvatarUrl,
        phone,
        address,
        dob,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone
      });

      setVisible(false);
      resetForm();
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
              titleStyle={{ color: theme.colors.onSurface, fontWeight: 'bold', fontSize: 14 }}
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
              right={() => (
                <View style={{ flexDirection: 'row', paddingRight: 10 }}>
                  <Button mode="text" compact onPress={() => openEdit(item)}>Edit</Button>
                  <Button mode="text" textColor={theme.colors.error} compact onPress={() => handleDelete(item.emp_code)}>Remove</Button>
                </View>
              )}
            />
          </Card>
        )}
      />

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)} style={{ maxHeight: '80%' }}>
          <Dialog.Title style={{ fontWeight: 'bold' }}>{editingEmp ? 'Edit Employee' : 'Add Employee'}</Dialog.Title>
          <Dialog.ScrollArea style={{ paddingHorizontal: 0 }}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }}>
              <View style={{ alignItems: 'center', marginVertical: 20 }}>
                <TouchableOpacity onPress={pickImage}>
                  {imageUri ? (
                    <Avatar.Image size={80} source={{ uri: imageUri }} />
                  ) : (
                    <Avatar.Icon size={80} icon="account-plus" />
                  )}
                  <View style={{ 
                    position: 'absolute', 
                    right: 0, 
                    bottom: 0, 
                    backgroundColor: theme.colors.primary, 
                    borderRadius: 12, 
                    padding: 4 
                  }}>
                    <Avatar.Icon size={16} icon="camera" color="white" style={{ backgroundColor: 'transparent' }} />
                  </View>
                </TouchableOpacity>
                <Text style={{ marginTop: 8, color: theme.colors.primary }}>Set Profile Picture</Text>
              </View>

              <TextInput label="Name" value={empName} onChangeText={setEmpName} style={styles.input} mode="outlined" />
              <TextInput label="Code" value={empCode} onChangeText={setEmpCode} disabled={!!editingEmp} style={styles.input} mode="outlined" />
              <TextInput label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} mode="outlined" />
              <TextInput label="Date of Birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} style={styles.input} mode="outlined" placeholder="YYYY-MM-DD" />
              <TextInput label="Address" value={address} onChangeText={setAddress} multiline numberOfLines={2} style={styles.input} mode="outlined" />
              
              <Text variant="titleSmall" style={{ marginTop: 10, fontWeight: 'bold', color: theme.colors.primary }}>Emergency Contact</Text>
              <TextInput label="Contact Name" value={emergencyName} onChangeText={setEmergencyName} style={styles.input} mode="outlined" />
              <TextInput label="Contact Phone" value={emergencyPhone} onChangeText={setEmergencyPhone} keyboardType="phone-pad" style={styles.input} mode="outlined" />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSave}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <EmployeeProfileModal 
        visible={profileVisible} 
        onDismiss={() => setProfileVisible(false)} 
        employee={selectedProfile} 
      />

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => { resetForm(); setVisible(true); }}
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
  input: { marginBottom: 12 },
  fab: { position: 'absolute', margin: 20, right: 0, bottom: 0 },
  loader: { position: 'absolute', top: '50%', left: '50%' }
});

export default ManageEmployeesScreen;
