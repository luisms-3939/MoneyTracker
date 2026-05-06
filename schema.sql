-- =============================================
-- MoneyScope — Supabase Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT DEFAULT '#64748B',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Income
CREATE TABLE IF NOT EXISTS income (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  recurring BOOLEAN DEFAULT FALSE,
  recurrence_type TEXT CHECK (recurrence_type IN ('weekly', 'monthly', 'yearly')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  recurring BOOLEAN DEFAULT FALSE,
  recurrence_type TEXT CHECK (recurrence_type IN ('weekly', 'monthly', 'yearly')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories
INSERT INTO categories (name, type, color) VALUES
  ('Salary',           'income',  '#10B981'),
  ('Bonus',            'income',  '#22D3EE'),
  ('Freelance',        'income',  '#6366F1'),
  ('Extras',           'income',  '#F59E0B'),
  ('Investments',      'income',  '#3B82F6'),
  ('Rent/Mortgage',    'expense', '#F43F5E'),
  ('Food & Groceries', 'expense', '#FB923C'),
  ('Transport',        'expense', '#FBBF24'),
  ('Subscriptions',    'expense', '#8B5CF6'),
  ('Entertainment',    'expense', '#EC4899'),
  ('Healthcare',       'expense', '#14B8A6'),
  ('Shopping',         'expense', '#EF4444'),
  ('Utilities',        'expense', '#64748B'),
  ('Education',        'expense', '#6366F1'),
  ('Other',            'expense', '#94A3B8')
ON CONFLICT DO NOTHING;

-- Row Level Security (allow anon for personal use)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE income     ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_categories" ON categories FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_income"     ON income     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_expenses"   ON expenses   FOR ALL TO anon USING (true) WITH CHECK (true);
