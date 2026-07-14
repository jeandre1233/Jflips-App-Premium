-- Create cheer_registrations table
CREATE TABLE IF NOT EXISTS cheer_registrations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  preferred_parent_to_contact TEXT DEFAULT 'First Parent',
  second_parent_name TEXT,
  second_parent_phone TEXT,
  athlete_name TEXT NOT NULL,
  athlete_surname TEXT NOT NULL,
  dob DATE NOT NULL,
  age INTEGER,
  medical_conditions TEXT,
  allergies TEXT,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  consent_correct BOOLEAN DEFAULT false,
  consent_interest BOOLEAN DEFAULT false,
  consent_storage BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'New',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE cheer_registrations ENABLE ROW LEVEL SECURITY;

-- Allow public anonymous inserts (so parents can register without logging in)
DROP POLICY IF EXISTS "Allow public inserts for cheer_registrations" ON cheer_registrations;
CREATE POLICY "Allow public inserts for cheer_registrations" 
  ON cheer_registrations FOR INSERT 
  WITH CHECK (true);

-- Allow gym owners (authenticated users) to select, update and delete their own cheer registrations
DROP POLICY IF EXISTS "Allow owners to manage cheer_registrations" ON cheer_registrations;
CREATE POLICY "Allow owners to manage cheer_registrations" 
  ON cheer_registrations FOR ALL 
  USING (auth.uid() = user_id);
