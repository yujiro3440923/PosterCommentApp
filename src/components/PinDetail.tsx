'use client'

import { useState, useEffect } from 'react'
import { supabase, Pin, Reply } from '@/lib/supabase'
import { Send, X } from 'lucide-react'

interface PinDetailProps {
    pin: Pin
    onClose: () => void
    onDelete: (id: string) => void
}

export function PinDetail({ pin, onClose, onDelete }: PinDetailProps) {
    const [replies, setReplies] = useState<Reply[]>([])
    const [newReply, setNewReply] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [replyAuthor, setReplyAuthor] = useState('')

    useEffect(() => {
        // Fetch replies
        const fetchReplies = async () => {
            const { data } = await supabase
                .from('replies')
                .select('*')
                .eq('pin_id', pin.id)
                .order('created_at', { ascending: true })
            if (data) setReplies(data)
        }
        fetchReplies()

        // Subscribe to new replies
        const channel = supabase.channel(`replies:${pin.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'replies', filter: `pin_id=eq.${pin.id}` }, (payload) => {
                setReplies(prev => [...prev, payload.new as Reply])
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [pin.id])

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newReply.trim()) return
        setIsSubmitting(true)

        const { error } = await supabase.from('replies').insert({
            pin_id: pin.id,
            author_name: replyAuthor || 'Anonymous',
            body: newReply
        })

        if (error) {
            alert('Failed to reply')
            console.error(error)
        } else {
            setNewReply('')
        }
        setIsSubmitting(false)
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>{pin.author_name || 'Anonymous'}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <X size={20} color="#666" />
                    </button>
                </div>

                <div style={{ borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 10 }}>
                    <p style={{ margin: '0 0 8px 0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{pin.body}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>{new Date(pin.created_at).toLocaleString()}</span>
                        <button className="btn" style={{ background: '#ef4444', color: 'white', padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => onDelete(pin.id)}>
                            Delete Pin
                        </button>
                    </div>
                </div>

                {/* Replies List */}
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: 15, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100px' }}>
                    {replies.length === 0 && <p style={{ color: '#999', textAlign: 'center', fontSize: '0.9rem', marginTop: 20 }}>No replies yet.</p>}
                    {replies.map(r => (
                        <div key={r.id} style={{ background: '#f9f9f9', padding: '8px 12px', borderRadius: 8 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: 2, color: '#444' }}>{r.author_name || 'Anonymous'}</div>
                            <div style={{ fontSize: '0.95rem', color: '#333' }}>{r.body}</div>
                        </div>
                    ))}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} style={{ borderTop: '1px solid #eee', paddingTop: 15 }}>
                    <input
                        className="input"
                        style={{ marginBottom: 8, fontSize: '0.85rem', padding: '6px 10px' }}
                        placeholder="Your Name (Optional)"
                        value={replyAuthor}
                        onChange={e => setReplyAuthor(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            className="input"
                            style={{ fontSize: '0.95rem' }}
                            placeholder="Write a reply..."
                            value={newReply}
                            onChange={e => setNewReply(e.target.value)}
                            required
                        />
                        <button type="submit" className="btn" style={{ background: '#000', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44 }} disabled={isSubmitting}>
                            <Send size={18} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
