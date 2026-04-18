-- SQL script for Supabase SQL Editor

-- 1. Create Employees table
CREATE TABLE employees (
    emp_code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Attendance Logs table
CREATE TABLE attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_code TEXT REFERENCES employees(emp_code) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('PRESENT', 'ABSENT', 'HALF_DAY')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(emp_code, date)
);

-- 3. (Optional) Enable Row Level Security
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- Note: For simplicity in development, you can keep RLS disabled 
-- or create policies that allow all authenticated users to read/write.
