'use client'

import { useState } from 'react'
import { supabase, Pin } from '@/lib/supabase'
import Link from 'next/link'
import { MapPin, Trash2, MessageCircle } from 'lucide-react'

interface PinListProps {
    initialPins: Pin[]
}

export function PinList({ initialPins }: PinListProps) {
    const [pins, setPins] = useState<Pin[]>(initialPins)

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this comment?')) return

        const { error } = await supabase.from('pins').delete().eq('id', id)
        if (error) {
            alert('Failed to delete')
            console.error(error)
        } else {
            setPins(prev => prev.filter(p => p.id !== id))
        }
    }

    if (pins.length === 0) {
        return <p style={{ textAlign: 'center', color: '#666', marginTop: 50 }}>No comments yet.</p>
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {pins.map((pin) => (
                <div key={pin.id} style={{
                    border: '1px solid #e5e5e5',
                    borderRadius: 12,
                    padding: 16,
                    background: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600 }}>{pin.author_name || 'Anonymous'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.8rem', color: '#999' }}>
                                {new Date(pin.created_at).toLocaleString()}
                            </span>
                            {pin.replies && pin.replies[0]?.count > 0 && (
                                <span style={{ fontSize: '0.8rem', color: '#0284c7', background: '#e0f2fe', padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <MessageCircle size={12} />
                                    {pin.replies[0].count}
                                </span>
                            )}
                            <button
                                onClick={() => handleDelete(pin.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#ef4444',
                                    padding: 4
                                }}
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                    <p style={{ fontSize: '1rem', lineHeight: 1.5, marginBottom: 12, wordBreak: 'break-word' }}>
                        {pin.body}
                    </p>
                    <Link
                        href={`/?pin=${pin.id}`}
                        className="btn"
                        style={{
                            fontSize: '0.875rem',
                            padding: '6px 12px',
                            background: '#f0f9ff',
                            color: '#0284c7',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                        }}
                    >
                        <MapPin size={16} />
                        View Location
                    </Link>
                </div>
            ))}
        </div>
    )
}
