'use client'

import React, { useState, useEffect } from 'react'

interface TeamAuthModalProps {
    isOpen: boolean
    onClose: () => void
    onAuthenticated: () => void
}

export function TeamAuthModal({ isOpen, onClose, onAuthenticated }: TeamAuthModalProps) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setPassword('')
            setError(false)
        }
    }, [isOpen])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (password === '5553') {
            onAuthenticated()
            onClose()
        } else {
            setError(true)
        }
    }

    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '320px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', textAlign: 'center' }}>Team Access</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
                    Please enter the team password.
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value)
                            setError(false)
                        }}
                        placeholder="Password"
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: `1px solid ${error ? '#ef4444' : '#ddd'}`,
                            borderRadius: '6px',
                            marginBottom: '16px',
                            fontSize: '1rem',
                            outline: 'none'
                        }}
                        autoFocus
                    />
                    {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: -12, marginBottom: 12 }}>Incorrect password.</p>}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: '#f5f5f5',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: 'black',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            Enter
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
