import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export const exportAttendanceToExcel = async (referenceDate: Date = new Date()) => {
  try {
    // 1. Calculate Date Range (26th of prev month to 25th of current month)
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 26);
    const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 25);
    
    // Use local time strings to avoid UTC shifts
    const startDateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-26`;
    const endDateStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-25`;
    
    const monthName = referenceDate.toLocaleString('default', { month: 'long' });

    // Fetch records within range
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
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return { success: false, message: `No records found for ${monthName} cycle (${startDateStr} to ${endDateStr})` };
    }

    // 2. Pivot data
    const pivotMap: Record<string, any> = {};
    const allDates = new Set<string>();

    data.forEach((row: any) => {
      const empCode = row.employees?.emp_code;
      const empName = row.employees?.name;
      const date = row.date;
      
      if (!empCode) return;
      allDates.add(date);
      
      if (!pivotMap[empCode]) {
        pivotMap[empCode] = {
          'Employee ID': empCode,
          'Employee Name': empName,
          'Week Off': 0,
          'Leaves': 0,
          'Half Day': 0,
          'Present Days': 0,
          'LOP': 0
        };
      }
      
      const status = row.status;
      if (status === 'OFF') pivotMap[empCode]['Week Off']++;
      else if (status === 'ABSENT') pivotMap[empCode]['Leaves']++;
      else if (status === 'HALF_DAY') pivotMap[empCode]['Half Day']++;
      else if (status === 'PRESENT') pivotMap[empCode]['Present Days']++;
      
      const statusMap: Record<string, string> = {
        'PRESENT': 'P',
        'ABSENT': 'A',
        'HALF_DAY': 'H',
        'OFF': 'OFF'
      };
      
      pivotMap[empCode][date] = statusMap[status] || status;
    });

    const sortedDates = Array.from(allDates).sort();

    // Convert map to array for sheet generation and apply business logic
    const exportData = Object.values(pivotMap).map((row: any) => {
      // Logic 1: Add Half Days to Present Days (0.5 for each Half Day)
      row['Present Days'] = row['Present Days'] + (row['Half Day'] * 0.5);

      // Logic 2: If Leaves > 2, cap Leaves at 2 and put excess in LOP
      if (row['Leaves'] > 2) {
        row['LOP'] = row['Leaves'] - 2;
        row['Leaves'] = 2;
      } else {
        row['LOP'] = 0;
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData, { 
      header: ['Employee ID', 'Employee Name', ...sortedDates, 'Week Off', 'Leaves', 'Half Day', 'Present Days', 'LOP'] 
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${monthName} Attendance`);

    const filename = `Attendance_Report_${monthName}_2026.xlsx`;

    if (Platform.OS === 'web') {
      XLSX.writeFile(wb, filename);
      return { success: true };
    }

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const uri = FileSystem.cacheDirectory + filename;

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

