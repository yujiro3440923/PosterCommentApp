
'use client'

import React, { useEffect, useState, useCallback, Suspense } from 'react'
import { TransformWrapper, TransformComponent, ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch'
import { Plus, List } from 'lucide-react'
import { supabase, Pin } from '@/lib/supabase'
import { Modal } from '@/components/Modal'
import { PinDetail } from '@/components/PinDetail'
import { PinMarker } from '@/components/PinMarker'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { TeamAuthModal } from '@/components/TeamAuthModal'
import { Eye, EyeOff } from 'lucide-react'

function PosterBoard() {
    const [pins, setPins] = useState<Pin[]>([])
    const [isPlacing, setIsPlacing] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [pendingLoc, setPendingLoc] = useState<{ x: number; y: number } | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [cooldown, setCooldown] = useState(false)

    // New State for Features
    const [showPins, setShowPins] = useState(true)
    const [isTeamMember, setIsTeamMember] = useState(false)
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [pendingAction, setPendingAction] = useState<'list' | 'upload' | null>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const transformRef = React.useRef<ReactZoomPanPinchContentRef>(null)
    const searchParams = useSearchParams()
    const highlightId = searchParams.get('pin')

    const [posterUrl, setPosterUrl] = useState('/poster.svg')
    const [isUploading, setIsUploading] = useState(false)

    // Auth Handlers
    const handleTeamAction = (action: 'list' | 'upload') => {
        if (isTeamMember) {
            executeAction(action)
        } else {
            setPendingAction(action)
            setAuthModalOpen(true)
        }
    }

    const executeAction = (action: 'list' | 'upload') => {
        if (action === 'list') {
            window.location.href = '/home'
        } else if (action === 'upload') {
            fileInputRef.current?.click()
        }
    }

    const handleAuthenticated = () => {
        setIsTeamMember(true)
        if (pendingAction) {
            executeAction(pendingAction)
            setPendingAction(null)
        }
    }

    // Handle file upload
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return

        const file = e.target.files[0]
        setIsUploading(true)

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `current_poster.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('posters')
                .upload(fileName, file, { upsert: true })

            if (uploadError) throw uploadError

            const { data } = supabase.storage.from('posters').getPublicUrl(fileName)
            setPosterUrl(`${data.publicUrl}?t=${Date.now()}`)
        } catch (error) {
            console.error('Upload failed:', error)
            alert('Upload failed. Please try again.')
        } finally {
            setIsUploading(false)
        }
    }

    // Load initial data
    const loadData = useCallback(async () => {
        const { data: pinData } = await supabase.from('pins').select('*')
        if (pinData) setPins(pinData)

        const { data: files } = await supabase.storage.from('posters').list()
        if (files && files.length > 0) {
            const sorted = files.sort((a, b) =>
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )
            const current = sorted.find(f => f.name.startsWith('current_poster'))
            if (current) {
                const { data } = supabase.storage.from('posters').getPublicUrl(current.name)
                setPosterUrl(`${data.publicUrl}?t=${new Date(current.updated_at).getTime()}`)
            }
        }
    }, [])

    useEffect(() => {
        loadData()
        const channel = supabase.channel('pins_updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pins' }, (payload) => {
                const newPin = payload.new as Pin
                setPins((prev) => {
                    if (prev.some(p => p.id === newPin.id)) return prev
                    return [...prev, newPin]
                })
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [loadData])

    const [selectedPin, setSelectedPin] = useState<Pin | null>(null)

    // Delete pin
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this comment?')) return

        const { error, data } = await supabase.from('pins').delete().eq('id', id).select()

        if (error) {
            alert('Failed to delete')
            console.error(error)
        } else if (!data || data.length === 0) {
            alert('削除に失敗しました。\nSupabaseのSQLエディタで削除ポリシーを実行してください。\n(Failed to delete. Please run the DELETE policy in Supabase SQL Editor.)')
        } else {
            setPins(prev => prev.filter(p => p.id !== id))
            if (selectedPin?.id === id) setSelectedPin(null)
            if (highlightId === id) {
                // clear param?
            }
        }
    }

    // Handle click on poster
    const handlePosterClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!isPlacing) return

        const rect = e.currentTarget.getBoundingClientRect()
        // Calculate relative to the rendering box using client coordinates for zoom safety
        const x = (e.clientX - rect.left) / rect.width
        const y = (e.clientY - rect.top) / rect.height

        setPendingLoc({ x, y })
        setModalOpen(true)
        setIsPlacing(false)
    }

    const handlePost = async (author: string, body: string) => {
        if (!pendingLoc || cooldown) return
        setIsSubmitting(true)

        try {
            const { data, error } = await supabase.from('pins').insert({
                x: pendingLoc.x,
                y: pendingLoc.y,
                author_name: author || 'Anonymous',
                body,
            }).select().single()

            if (error) throw error

            if (data) {
                setPins(prev => [...prev, data as Pin])
            }

            setCooldown(true)
            setTimeout(() => setCooldown(false), 10000)
            setModalOpen(false)
            setPendingLoc(null)
        } catch (err) {
            alert('Failed to post. Please try again.')
            console.error(err)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Zoom to pin effect (Coordinate based)
    useEffect(() => {
        if (highlightId && transformRef.current && pins.length > 0) {
            const pin = pins.find(p => p.id === highlightId)
            if (pin) {
                setTimeout(() => {
                    if (!transformRef.current) return
                    const { wrapperComponent, contentComponent } = transformRef.current.instance
                    if (!wrapperComponent || !contentComponent) return

                    const wrapperRect = wrapperComponent.getBoundingClientRect()
                    const contentRect = contentComponent.getBoundingClientRect()

                    const scale = 2
                    const unscaledWidth = contentRect.width / transformRef.current.instance.transformState.scale
                    const unscaledHeight = contentRect.height / transformRef.current.instance.transformState.scale

                    const targetX = pin.x * unscaledWidth
                    const targetY = pin.y * unscaledHeight

                    const x = (wrapperRect.width / 2) - (targetX * scale)
                    const y = (wrapperRect.height / 2) - (targetY * scale)

                    transformRef.current.setTransform(x, y, scale, 500)
                    setSelectedPin(pin)
                }, 500)
            }
        }
    }, [highlightId, pins])

    return (
        <main style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#f5f5f5' }}>

            {/* Top Bar / Controls */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 50, display: 'flex', gap: '10px' }}>
                <button
                    onClick={() => handleTeamAction('list')}
                    className="btn"
                    style={{ background: 'white', color: 'black', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
                >
                    <List size={20} style={{ marginRight: 8 }} />
                    List
                </button>

                <button
                    onClick={() => setShowPins(!showPins)}
                    className="btn"
                    style={{ background: 'white', color: 'black', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
                    title={showPins ? "Hide Pins" : "Show Pins"}
                >
                    {showPins ? <Eye size={20} style={{ marginRight: 8 }} /> : <EyeOff size={20} style={{ marginRight: 8 }} />}
                    {showPins ? "Hide" : "Show"}
                </button>

                <label className="btn" style={{ background: 'white', color: 'black', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', cursor: isUploading ? 'wait' : 'pointer', opacity: isUploading ? 0.7 : 1 }}>
                    <span onClick={(e) => {
                        e.preventDefault()
                        handleTeamAction('upload')
                    }}>
                        {isUploading ? 'Uploading...' : 'Upload Poster'}
                    </span>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        disabled={isUploading}
                    />
                </label>

                {isTeamMember && (
                    <div style={{
                        background: '#dcfce7', color: '#166534', padding: '0 12px',
                        borderRadius: 20, display: 'flex', alignItems: 'center', fontSize: '0.8rem', fontWeight: 600,
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}>
                        Team Mode
                    </div>
                )}
            </div>

            <div style={{ position: 'absolute', bottom: 30, right: 30, zIndex: 50 }}>
                <button
                    className="btn"
                    style={{
                        width: 60, height: 60, borderRadius: '50%',
                        background: isPlacing ? '#ef4444' : '#000',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                        fontSize: '1.5rem'
                    }}
                    onClick={() => {
                        if (cooldown) {
                            alert('Please wait 10 seconds between posts.')
                            return
                        }
                        setIsPlacing(!isPlacing)
                    }}
                >
                    {isPlacing ? '×' : <Plus size={32} />}
                </button>
                {isPlacing && (
                    <div style={{ position: 'absolute', right: 70, bottom: 15, background: 'black', color: 'white', padding: '4px 12px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                        Tap on poster
                    </div>
                )}
            </div>

            {/* Main Poster Area */}
            <TransformWrapper
                ref={transformRef}
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit
                wheel={{ step: 0.1 }}
            >
                <TransformComponent wrapperStyle={{ width: '100vw', height: '100vh' }} contentStyle={{ width: '100%', height: '100%' }}>
                    <div
                        style={{ position: 'relative', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <div
                            style={{ position: 'relative', display: 'inline-block', boxShadow: '0 0 20px rgba(0,0,0,0.1)' }}
                            onClick={handlePosterClick}
                        >
                            <img
                                src={posterUrl}
                                alt="Poster"
                                style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block', pointerEvents: isPlacing ? 'none' : 'auto' }}
                            />

                            {isPlacing && (
                                <div style={{ position: 'absolute', inset: 0, cursor: 'crosshair', zIndex: 5, background: 'rgba(0,0,0,0.1)' }} />
                            )}

                            {showPins && pins.map((pin) => (
                                <div key={pin.id} id={`pin-${pin.id}`} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                                    <PinMarker
                                        x={pin.x}
                                        y={pin.y}
                                        isHighlighted={pin.id === highlightId}
                                        onClick={() => {
                                            setSelectedPin(pin)
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </TransformComponent>
            </TransformWrapper>

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handlePost}
                isSubmitting={isSubmitting}
                x={pendingLoc?.x || 0}
                y={pendingLoc?.y || 0}
            />

            <TeamAuthModal
                isOpen={authModalOpen}
                onClose={() => {
                    setAuthModalOpen(false)
                    setPendingAction(null)
                }}
                onAuthenticated={handleAuthenticated}
            />

            {/* Selected Pin Detail View */}
            {selectedPin && (
                <PinDetail
                    pin={selectedPin}
                    onClose={() => setSelectedPin(null)}
                    onDelete={handleDelete}
                />
            )}
        </main>
    )
}

export default function Page() {
    return (
        <Suspense fallback={<div>Loading poster...</div>}>
            <PosterBoard />
        </Suspense>
    )
}
