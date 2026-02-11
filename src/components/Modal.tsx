
'use client'

import React, { useEffect } from 'react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (author: string, body: string) => void
    isSubmitting: boolean
    x: number
    y: number
}

export function Modal({ isOpen, onClose, onSubmit, isSubmitting, x, y }: ModalProps) {
    const [body, setBody] = React.useState('')
    const [author, setAuthor] = React.useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!body.trim()) return
        onSubmit(author, body)
    }

    // Reset form when opened
    useEffect(() => {
        if (isOpen) {
            setBody('')
            setAuthor('')
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2 style={{ marginBottom: '1rem' }}>Add Comment</h2>
                <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#666' }}>
                    Location: ({x.toFixed(2)}, {y.toFixed(2)})
                </p>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Name (Optional)</label>
                        <input
                            className="input"
                            type="text"
                            placeholder="Anonymous"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            maxLength={50}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Comment *</label>
                        <textarea
                            className="textarea"
                            placeholder="Write a comment..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            required
                            minLength={1}
                            maxLength={300}
                            rows={4}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                            type="button"
                            className="btn"
                            style={{ background: '#e5e5e5', color: '#000' }}
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn"
                            style={{ background: '#000', color: '#fff' }}
                            disabled={isSubmitting || !body.trim()}
                        >
                            {isSubmitting ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
