import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

const parseTimeStr = (str: string) => {
  if (!str) return 0;
  
  // Case 1: "Xh Ym" or "Xh" or "Ym"
  const hMatch = str.match(/(\d+)h/);
  const mMatch = str.match(/(\d+)m/);
  
  if (hMatch || mMatch) {
    const h = hMatch ? parseInt(hMatch[1]) : 0;
    const m = mMatch ? parseInt(mMatch[1]) : 0;
    return h + (m / 60);
  }
  
  // Case 2: Decimal number "1.5"
  const decimalValue = parseFloat(str);
  return isNaN(decimalValue) ? 0 : decimalValue;
};

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
      fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'base64',
      });
    }

    const workbook = XLSX.read(fileBase64, { type: 'base64' });
    let sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (jsonData.length === 0) {
      return { success: false, message: 'No data found in Excel' };
    }

    const employees: any[] = [];
    const logs: any[] = [];

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
      // Improved matching for "Employee ID" and "Employee Name"
      const empCodeKey = Object.keys(row).find(k => {
        const normalized = k.toLowerCase().replace(/[\s._]/g, '');
        return ['empcode', 'code', 'employeeid', 'id'].includes(normalized);
      });

      const nameKey = Object.keys(row).find(k => {
        const normalized = k.toLowerCase().replace(/[\s._]/g, '');
        return ['name', 'employeename', 'name'].includes(normalized);
      });

      const empCode = String(row[empCodeKey || ''] || '').trim();
      const name = String(row[nameKey || ''] || '').trim();

      if (empCode && name) {
        employees.push({ emp_code: empCode, name, is_active: true });

        Object.keys(row).forEach(key => {
          let dateStr: string | null = null;

          if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
            dateStr = key;
          } else {
            const fullDateMatch = key.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
            if (fullDateMatch) {
              const m = parseInt(fullDateMatch[1]) - 1;
              const d = parseInt(fullDateMatch[2]);
              let y = parseInt(fullDateMatch[3]);
              if (y < 100) y += 2000;
              dateStr = new Date(y, m, d).toISOString().split('T')[0];
            }
          }

          if (dateStr) {
            const rawVal = String(row[key] || '').toUpperCase().trim();
            if (!rawVal) return;

            const mainStatus = rawVal.split(' ')[0];
            const status = statusMap[mainStatus];

            if (status) {
              let lateHours = 0;
              let permHours = 0;

              // Match content inside parentheses, e.g., "P (L:1h 30m,P:2h)"
              const timeParts = rawVal.match(/\(([^)]+)\)/);
              if (timeParts) {
                const parts = timeParts[1].split(',');
                parts.forEach(p => {
                  if (p.trim().startsWith('L:')) {
                    lateHours = parseTimeStr(p.replace('L:', '').trim());
                  } else if (p.trim().startsWith('P:')) {
                    permHours = parseTimeStr(p.replace('P:', '').trim());
                  }
                });
              } else {
                // Fallback for older formats or direct L:X P:Y matches
                const lateMatch = rawVal.match(/L:([\w\d.]+)/);
                const permMatch = rawVal.match(/P:([\w\d.]+)/);
                if (lateMatch) lateHours = parseTimeStr(lateMatch[1]);
                if (permMatch) permHours = parseTimeStr(permMatch[1]);
              }

              logs.push({
                emp_code: empCode,
                date: dateStr,
                status: status,
                late_hours: lateHours,
                permission_hours: permHours
              });
            }
          }
        });
      }
    });

    if (employees.length === 0) {
        return { success: false, message: 'Could not find "Employee ID" or "Employee Name" columns.' };
    }

    // 1. Restore Employees
    const { error: empError } = await supabase.from('employees').upsert(employees, { onConflict: 'emp_code' });
    if (empError) throw empError;

    // 2. Restore Logs in chunks
    if (logs.length > 0) {
      for (let i = 0; i < logs.length; i += 50) {
        const chunk = logs.slice(i, i + 50);
        const { error: logError } = await supabase.from('attendance_logs').upsert(chunk, { onConflict: 'emp_code, date' });
        if (logError) throw logError;
      }
    }

    return { success: true, count: employees.length, logsCount: logs.length };
  } catch (error: any) {
    console.error('Excel Import Error:', error);
    return { success: false, message: error.message };
  }
};
