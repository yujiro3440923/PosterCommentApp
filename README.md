# Poster Comment App

A real-time, position-based commenting system for poster presentations. Built with Next.js (App Router) and Supabase.

## 📦 Project Structure

```
poster-app/
├── app/
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Main Poster View (Zoom/Pan + Pins)
│   └── home/
│       └── page.tsx      # List View of comments
├── components/
│   ├── Modal.tsx         # Comment input modal
│   └── PinMarker.tsx     # Pin visualization
├── lib/
│   └── supabase.ts       # Supabase client singleton
├── public/
│   └── poster.jpg        # The poster image (Replace this!)
└── supabase_schema.sql   # SQL for database setup
```

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install
# Already installed: next, react, react-dom, react-zoom-pan-pinch, @supabase/supabase-js, lucide-react
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Setup (Supabase)

Run the following SQL in your Supabase SQL Editor to create the table and policies:

```sql
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
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🛠 Features

- **Zoom & Pan**: Use mouse wheel, drag, or pinch gestures to explore the poster.
- **Add Comments**: Click on the "+" button, then tap anywhere on the poster to leave a comment.
- **List View**: Click "List" to see all comments chronologically.
- **Deep Linking**: Clicking "View Location" in the list view zooms directly to the pin.

## ☁️ Deployment (Vercel)

1. Push this code to a GitHub repository.
2. Import the project into Vercel.
3. Add the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the Vercel Project Settings > Environment Variables.
4. Deploy!
