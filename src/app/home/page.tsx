import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PinList } from '@/components/PinList'

// Opt out of caching for this page to always get latest comments
export const dynamic = 'force-dynamic'

export default async function Home() {
    const { data: pins } = await supabase
        .from('pins')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '20px' }}>
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: 30 }}>
                <Link href="/" style={{ marginRight: 15, padding: 8, borderRadius: '50%', background: '#f5f5f5' }}>
                    <ArrowLeft size={24} />
                </Link>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Comments List</h1>
            </header>

            <PinList initialPins={pins || []} />
        </main>
    )
}
