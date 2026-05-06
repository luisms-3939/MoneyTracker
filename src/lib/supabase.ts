import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://baprhiqmtjtmeqpqquen.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhcHJoaXFtdGp0bWVxcHFxdWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTQyMTEsImV4cCI6MjA5MzQ5MDIxMX0.02oExpK8RwDwoc_7FdcwiHdElKuuuD6ptxoMdACLBeY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)