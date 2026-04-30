import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

const formatTime = (decimalHours: number | null) => {
  if (decimalHours == null || decimalHours === 0) return '0h';
  const totalMinutes = Math.round(decimalHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

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
        permission_hours,
        late_hours,
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
          'Late Hours': 0,
          'Perm. Hours': 0,
          'L/P Cut': 0,
          'LOP': 0
        };
      }
      
      const status = row.status;
      if (status === 'OFF') pivotMap[empCode]['Week Off']++;
      else if (status === 'ABSENT') pivotMap[empCode]['Leaves']++;
      else if (status === 'HALF_DAY') pivotMap[empCode]['Half Day']++;
      else if (status === 'PRESENT') pivotMap[empCode]['Present Days']++;
      
      pivotMap[empCode]['Late Hours'] += Number(row.late_hours || 0);
      pivotMap[empCode]['Perm. Hours'] += Number(row.permission_hours || 0);

      const statusMap: Record<string, string> = {
        'PRESENT': 'P',
        'ABSENT': 'A',
        'HALF_DAY': 'H',
        'OFF': 'OFF'
      };
      
      let displayStatus = statusMap[status] || status || '';
      if (row.late_hours > 0 || row.permission_hours > 0) {
        const parts = [];
        if (row.late_hours > 0) parts.push(`L:${formatTime(row.late_hours)}`);
        if (row.permission_hours > 0) parts.push(`P:${formatTime(row.permission_hours)}`);
        displayStatus += ` (${parts.join(',')})`;
      }
      pivotMap[empCode][date] = displayStatus;
    });

    const sortedDates = Array.from(allDates).sort();

    // Convert map to array for sheet generation and apply business logic
    const exportData = Object.values(pivotMap).map((row: any) => {
      // Deduction logic: combined (Perm + Late) > 4hrs = 0.5, > 8hrs = 1.0
      const totalLP = row['Late Hours'] + row['Perm. Hours'];
      if (totalLP > 8) row['L/P Cut'] = 1.0;
      else if (totalLP > 4) row['L/P Cut'] = 0.5;

      // Format the totals for display after deduction logic
      row['Late Hours'] = formatTime(row['Late Hours']);
      row['Perm. Hours'] = formatTime(row['Perm. Hours']);

      // Logic 1: Add Half Days to Present Days (0.5 for each Half Day)
      row['Present Days'] = row['Present Days'] + (row['Half Day'] * 0.5);

      // Logic 2: If Leaves > 2, cap Leaves at 2 and put excess in LOP
      const excessLeaves = Math.max(0, row['Leaves'] - 2);
      row['LOP'] = excessLeaves + (row['Half Day'] * 0.5) + row['L/P Cut'];
      
      if (row['Leaves'] > 2) {
        row['Leaves'] = 2;
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData, { 
      header: ['Employee ID', 'Employee Name', ...sortedDates, 'Week Off', 'Leaves', 'Half Day', 'Late Hours', 'Perm. Hours', 'L/P Cut', 'Present Days', 'LOP'] 
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${monthName} Attendance`);

    const filename = `Attendance_Report_${monthName}_${referenceDate.getFullYear()}.xlsx`;

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
