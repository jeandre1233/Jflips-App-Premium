-- Migration to separate tumbling students and team athletes

-- 1. Create tumbling_students table
CREATE TABLE tumbling_students (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  group_key TEXT,
  signup_source TEXT,
  first_name TEXT,
  last_name TEXT,
  dob DATE,
  age INTEGER,
  class_name TEXT,
  parent1_name TEXT,
  parent1_phone TEXT,
  parent1_email TEXT,
  parent2_name TEXT,
  parent2_phone TEXT,
  medical_notes TEXT,
  indemnity_signed BOOLEAN,
  indemnity_date TIMESTAMP WITH TIME ZONE,
  signature_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create team_athletes table
CREATE TABLE team_athletes (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  associated_gym_id TEXT REFERENCES gyms(id) ON DELETE CASCADE,
  is_cheer BOOLEAN,
  sub_team_ids TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Migrate data from students to tumbling_students
INSERT INTO tumbling_students (
  id, user_id, name, phone, group_key, signup_source, first_name, last_name, dob, age, class_name, parent1_name, parent1_phone, parent1_email, parent2_name, parent2_phone, medical_notes, indemnity_signed, indemnity_date, signature_data
)
SELECT 
  id, user_id, name, phone, group_key, signup_source, first_name, last_name, dob, age, class_name, parent1_name, parent1_phone, parent1_email, parent2_name, parent2_phone, medical_notes, indemnity_signed, indemnity_date, signature_data
FROM students
WHERE is_gym_member IS NOT TRUE;

-- 4. Migrate data from students to team_athletes
INSERT INTO team_athletes (
  id, user_id, name, associated_gym_id, is_cheer, sub_team_ids
)
SELECT 
  id, user_id, name, associated_gym_id, is_cheer, sub_team_ids
FROM students
WHERE is_gym_member IS TRUE;

-- 5. Enable RLS
ALTER TABLE tumbling_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_athletes ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for tumbling_students
CREATE POLICY "Users can manage their own tumbling students" 
  ON tumbling_students FOR ALL 
  USING (auth.uid() = user_id);

-- 7. RLS Policies for team_athletes
CREATE POLICY "Users can manage their own team athletes" 
  ON team_athletes FOR ALL 
  USING (auth.uid() = user_id);

-- Note: After verifying data migration, you can drop the old students table:
-- DROP TABLE students;

-- 8. Add auto_reset_invoice column to gyms and class_types
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS auto_reset_invoice BOOLEAN DEFAULT true;
ALTER TABLE class_types ADD COLUMN IF NOT EXISTS auto_reset_invoice BOOLEAN DEFAULT true;

-- 9. Add custom_event_presets column to gyms table
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS custom_event_presets text[] DEFAULT '{}';
