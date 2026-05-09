import React from 'react';
import { View, StyleSheet, Linking, TouchableOpacity, ScrollView } from 'react-native';
import { Portal, Dialog, Button, Text, Avatar, Divider, useTheme } from 'react-native-paper';

interface EmployeeProfileModalProps {
  visible: boolean;
  onDismiss: () => void;
  employee: any;
}

const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({ visible, onDismiss, employee }) => {
  const theme = useTheme();

  if (!employee) return null;

  const handleCall = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const InfoRow = ({ label, value, isPhone = false }: { label: string; value?: string; isPhone?: boolean }) => (
    <View style={styles.infoRow}>
      <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 2 }}>{label}</Text>
      {isPhone && value ? (
        <TouchableOpacity onPress={() => handleCall(value)}>
          <Text variant="bodyLarge" style={{ color: theme.colors.primary, fontWeight: 'bold', textDecorationLine: 'underline' }}>
            {value}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>{value || 'Not provided'}</Text>
      )}
    </View>
  );

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={{ borderRadius: 16 }}>
        <Dialog.Content style={{ paddingHorizontal: 0 }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }}>
            <View style={styles.header}>
              {employee.avatar_url ? (
                <Avatar.Image size={100} source={{ uri: employee.avatar_url }} />
              ) : (
                <Avatar.Text size={100} label={employee.name?.substring(0, 2).toUpperCase() || '??'} />
              )}
              <Text variant="titleLarge" style={styles.name}>{employee.name}</Text>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>ID: {employee.emp_code}</Text>
            </View>

            <Divider style={styles.divider} />

            <Text variant="titleMedium" style={styles.sectionTitle}>Contact Information</Text>
            <InfoRow label="Phone Number" value={employee.phone} isPhone={true} />
            <InfoRow label="Address" value={employee.address} />
            <InfoRow label="Date of Birth" value={employee.dob} />

            <Divider style={styles.divider} />

            <Text variant="titleMedium" style={styles.sectionTitle}>Emergency Contact</Text>
            <InfoRow label="Contact Name" value={employee.emergency_contact_name} />
            <InfoRow label="Contact Phone" value={employee.emergency_contact_phone} isPhone={true} />
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Close</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginVertical: 10,
  },
  name: {
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#4F46E5', // or theme.colors.primary
  },
  infoRow: {
    marginBottom: 12,
  },
});

export default EmployeeProfileModal;
