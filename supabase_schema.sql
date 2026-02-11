-- Create the pins table
CREATE TABLE pins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  x FLOAT NOT NULL CHECK (x >= 0 AND x <= 1),
  y FLOAT NOT NULL CHECK (y >= 0 AND y <= 1),
  author_name TEXT,
  body TEXT NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 300),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to read pins
CREATE POLICY "Enable read access for all users" ON pins
  FOR SELECT USING (true);

-- Create a policy that allows anyone to insert pins (for MVP without auth)
CREATE POLICY "Enable insert access for all users" ON pins
  FOR INSERT WITH CHECK (true);

-- Create a policy that allows anyone to delete pins (for MVP)
CREATE POLICY "Enable delete access for all users" ON pins
  FOR DELETE USING (true);

-- REPLIES TABLE
CREATE TABLE IF NOT EXISTS replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pin_id uuid REFERENCES pins(id) ON DELETE CASCADE NOT NULL,
  author_name text,
  body text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 300),
  created_at timestamp WITH time zone DEFAULT now()
);

-- Enable RLS for replies
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;

-- Create policies for replies
CREATE POLICY "Enable read access for all users" ON replies FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON replies FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON replies FOR DELETE USING (true);

-- STORAGE SETUP (Run this if you want persistent poster uploads)
-- Note: You might need to enable the Storage extension in Supabase dashboard if this fails, 
-- but usually 'storage' schema is available by default.

-- 1. Create the 'posters' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('posters', 'posters', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to read files in 'posters'
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'posters');

-- 3. Allow public access to upload files to 'posters'
CREATE POLICY "Public Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'posters');

-- 4. Allow public access to update (overwrite) files in 'posters'
CREATE POLICY "Public Update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'posters');
