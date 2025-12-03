
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lcdhxhopxztbmuuuheef.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZGh4aG9weHp0Ym11dXVoZWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTE3MTYsImV4cCI6MjA4MDM2NzcxNn0.NGa45JrksqRJ3Szo3MXqX5v7BEu-w3TFxD1b_nIGhpM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
