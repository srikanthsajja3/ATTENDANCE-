import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Using the Project ID and Key you provided
const supabaseUrl = 'https://pyfjfbuzftktjansmtqx.supabase.co';
const supabaseAnonKey = 'sb_publishable_0lAj3myAi1NJLQn0tlxiFA_ECWM3_hF';

if (!supabaseUrl || supabaseUrl.includes('YOUR_')) {
  console.error('Supabase URL is not configured correctly.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
