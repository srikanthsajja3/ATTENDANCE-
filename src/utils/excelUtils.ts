import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export interface EmployeeData {
  'EMP.CODE': string;
  NAME: string;
}

export const importEmployeesFromExcel = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ],
    });

    if (result.canceled) return { success: false, message: 'Import cancelled' };

    const fileUri = result.assets[0].uri;
    let fileBase64: string;

    if (Platform.OS === 'web') {
      // Web specific way to read file
      const response = await fetch(fileUri);
      const blob = await response.blob();
      fileBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.readAsDataURL(blob);
      });
    } else {
      // Mobile specific way
      fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'base64',
      });
    }

    const workbook = XLSX.read(fileBase64, { type: 'base64' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as EmployeeData[];

    if (jsonData.length === 0) {
      return { success: false, message: 'No data found in Excel' };
    }

    // 1. Format for Supabase with flexible column matching
    const employees: any[] = [];
    const logs: any[] = [];

    // Map status codes
    const statusMap: Record<string, string> = {
      'P': 'PRESENT',
      'A': 'ABSENT',
      'H': 'HALF_DAY',
      'O': 'OFF',
      'OFF': 'OFF',
      'PRESENT': 'PRESENT',
      'ABSENT': 'ABSENT',
      'HALF_DAY': 'HALF_DAY'
    };

    jsonData.forEach((row: any) => {
      const empCodeKey = Object.keys(row).find(k => 
        k.toLowerCase().replace(/[\s._]/g, '') === 'empcode' || 
        k.toLowerCase().replace(/[\s._]/g, '') === 'code'
      );
      const nameKey = Object.keys(row).find(k => 
        k.toLowerCase().replace(/[\s._]/g, '') === 'name'
      );

      const empCode = String(row[empCodeKey || ''] || '').trim();
      const name = String(row[nameKey || ''] || '').trim();

      if (empCode && name) {
        employees.push({ emp_code: empCode, name, is_active: true });

        // 2. Parse attendance columns (e.g., "26 Th", "1 W")
        Object.keys(row).forEach(key => {
          const dateMatch = key.match(/^(\d+)\s*([A-Za-z]*)$/);
          if (dateMatch) {
            const dayNum = parseInt(dateMatch[1]);
            const status = statusMap[String(row[key]).toUpperCase().trim()];
            
            if (status) {
              // Determine month based on current context (April 2026)
              // If day is large (26-31), it's likely March. If small (1-17), it's April.
              const month = (dayNum > 20) ? 2 : 3; // 2 = March, 3 = April (0-indexed)
              const date = new Date(2026, month, dayNum).toISOString().split('T')[0];
              
              logs.push({
                emp_code: empCode,
                date: date,
                status: status
              });
            }
          }
        });
      }
    });

    if (employees.length === 0) {
        return { success: false, message: 'Invalid data format. Ensure columns "Emp. Code" and "Name" exist.' };
    }

    // Upsert Employees
    const { error: empError } = await supabase
      .from('employees')
      .upsert(employees, { onConflict: 'emp_code' });

    if (empError) throw empError;

    // Upsert Logs (if any)
    if (logs.length > 0) {
      const { error: logError } = await supabase
        .from('attendance_logs')
        .upsert(logs, { onConflict: 'emp_code, date' });
      
      if (logError) console.error('History Import Error:', logError);
    }

    return { success: true, count: employees.length, logsCount: logs.length };
  } catch (error: any) {
    console.error('Excel Import Error:', error);
    return { success: false, message: error.message };
  }
};
