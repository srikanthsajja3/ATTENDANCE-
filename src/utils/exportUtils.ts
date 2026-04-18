import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export const exportAttendanceToExcel = async () => {
  try {
    // 1. Fetch all records joined with employee names
    const { data, error } = await supabase
      .from('attendance_logs')
      .select(`
        date,
        status,
        employees (
          emp_code,
          name
        )
      `)
      .order('date', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return { success: false, message: 'No attendance records to export' };
    }

    // 2. Flatten data for Excel
    const flatData = data.map((row: any) => ({
      Date: row.date,
      'Emp Code': row.employees?.emp_code,
      Name: row.employees?.name,
      Status: row.status,
    }));

    // 3. Create Workbook
    const ws = XLSX.utils.json_to_sheet(flatData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    if (Platform.OS === 'web') {
      // Browser download
      XLSX.writeFile(wb, 'attendance_report.xlsx');
      return { success: true };
    }

    // 4. Mobile Logic (FileSystem + Sharing)
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const uri = FileSystem.cacheDirectory + 'attendance_report.xlsx';

    await FileSystem.writeAsStringAsync(uri, wbout, {
      encoding: 'base64',
    });

    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Export Attendance Data',
      UTI: 'com.microsoft.excel.xlsx',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Export Error:', error);
    return { success: false, message: error.message };
  }
};

