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
    
    // Try to find a sheet with attendance data, prefer 'IN-OUT' or 'Attendance'
    let sheetName = workbook.SheetNames.find(name => 
      ['IN-OUT', 'ATTENDANCE', 'SHEET1'].includes(name.toUpperCase())
    ) || workbook.SheetNames[0];
    
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (jsonData.length === 0) {
      return { success: false, message: 'No data found in Excel' };
    }

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
      'ABSNET': 'ABSENT', // Handle typo in user's file
      'HALF_DAY': 'HALF_DAY'
    };

    jsonData.forEach((row: any) => {
      // Find Employee Code / ID
      const empCodeKey = Object.keys(row).find(k => {
        const normalized = k.toLowerCase().replace(/[\s._]/g, '');
        return normalized === 'empcode' || normalized === 'code' || normalized === 'employeeid' || normalized === 'id';
      });

      // Find Name
      const nameKey = Object.keys(row).find(k => {
        const normalized = k.toLowerCase().replace(/[\s._]/g, '');
        return normalized === 'name' || normalized === 'employeename';
      });

      const empCode = String(row[empCodeKey || ''] || '').trim();
      const name = String(row[nameKey || ''] || '').trim();

      if (empCode && name && empCode !== 'IN-TIME' && empCode !== 'Employee ID') {
        employees.push({ emp_code: empCode, name, is_active: true });

        // Parse attendance columns
        Object.keys(row).forEach(key => {
          let date: string | null = null;
          let status: string | null = null;

          // Case 1: Key is a date format like "12/26/25" or "1/1/26"
          const fullDateMatch = key.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
          if (fullDateMatch) {
            const m = parseInt(fullDateMatch[1]) - 1;
            const d = parseInt(fullDateMatch[2]);
            let y = parseInt(fullDateMatch[3]);
            if (y < 100) y += 2000;
            date = new Date(y, m, d).toISOString().split('T')[0];
          } 
          // Case 2: Key is a day number like "26 Th" or "1 W"
          else {
            const dayMatch = key.match(/^(\d+)\s*([A-Za-z]*)$/);
            if (dayMatch) {
              const dayNum = parseInt(dayMatch[1]);
              const month = (dayNum > 20) ? 2 : 3; // March or April 2026
              date = new Date(2026, month, dayNum).toISOString().split('T')[0];
            }
          }

          if (date) {
            const val = row[key];
            if (typeof val === 'number') {
              status = 'PRESENT'; // Numerical value usually means IN-TIME or worked hours
            } else if (typeof val === 'string') {
              status = statusMap[val.toUpperCase().trim()];
            }

            if (status) {
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
