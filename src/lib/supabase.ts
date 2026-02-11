
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Pin {
    id: string
    x: number
    y: number
    author_name: string
    body: string
    created_at: string
    replies?: { count: number }[]
}

export interface Reply {
    id: string
    pin_id: string
    author_name: string
    body: string
    created_at: string
}
