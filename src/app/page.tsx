
'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { TransformWrapper, TransformComponent, ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch'
import { Plus, List } from 'lucide-react'
import { supabase, Pin } from '@/lib/supabase'
import { Modal } from '@/components/Modal'
import { PinMarker } from '@/components/PinMarker'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function Page() {
    const [pins, setPins] = useState<Pin[]>([])
    const [isPlacing, setIsPlacing] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [pendingLoc, setPendingLoc] = useState<{ x: number; y: number } | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [cooldown, setCooldown] = useState(false)

    const transformRef = React.useRef<ReactZoomPanPinchContentRef>(null)
    const searchParams = useSearchParams()
    const highlightId = searchParams.get('pin')

    const [posterUrl, setPosterUrl] = useState('/poster.svg')
    const [isUploading, setIsUploading] = useState(false)

    // Handle file upload
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return

        const file = e.target.files[0]
        setIsUploading(true)

        try {
            // Upload to Supabase Storage, overwriting 'current'
            // We use a fixed name 'current' to ensure only one poster exists at a time (as requested)
            // We detect extension to be safe, or just force .png/.jpg? 
            // Let's just use 'current' and let the mime type handle it or just 'current_poster'
            const fileExt = file.name.split('.').pop()
            const fileName = `current_poster.${fileExt}`

            // Remove old files first? Or just Overwrite. Upsert is supported.
            const { error: uploadError } = await supabase.storage
                .from('posters')
                .upload(fileName, file, { upsert: true })

            if (uploadError) throw uploadError

            // Get Public URL
            const { data } = supabase.storage.from('posters').getPublicUrl(fileName)

            // Add timestamp to bust cache
            setPosterUrl(`${data.publicUrl}?t=${Date.now()}`)

            // Optimize: Save the filename to a DB? 
            // For MVP, we'll iterate the bucket to find the 'current_poster' to load on init.
        } catch (error) {
            console.error('Upload failed:', error)
            alert('Upload failed. Please try again.')
        } finally {
            setIsUploading(false)
        }
    }

    // Load initial data
    const loadData = useCallback(async () => {
        // 1. Fetch Pins
        const { data: pinData } = await supabase.from('pins').select('*')
        if (pinData) setPins(pinData)

        // 2. Fetch Poster
        // List files in bucket to find the current one
        const { data: files } = await supabase.storage.from('posters').list()
        if (files && files.length > 0) {
            // Sort by updated_at desc to get latest
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
                setPins((prev) => [...prev, payload.new as Pin])
            })
            // Listen for storage changes? Custom event? 
            // Storage doesn't emit realtime events by default easily for public.
            // We'll rely on refresh for other users for now, or maybe an interval?
            // User requirement: "Until another is uploaded".
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [loadData])

    const [selectedPin, setSelectedPin] = useState<Pin | null>(null)

    // Delete pin
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this comment?')) return

        const { error } = await supabase.from('pins').delete().eq('id', id)
        if (error) {
            alert('Failed to delete')
            console.error(error)
        } else {
            // Optimistic update
            setPins(prev => prev.filter(p => p.id !== id))
            if (selectedPin?.id === id) setSelectedPin(null)
            if (highlightId === id) {
                // clear param?
                // router.push('/') ? 
            }
        }
    }

    // Handle click on poster
    const handlePosterClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!isPlacing) return

        const rect = e.currentTarget.getBoundingClientRect()
        // Calculate relative to the rendering box
        const x = e.nativeEvent.offsetX / rect.width
        const y = e.nativeEvent.offsetY / rect.height

        setPendingLoc({ x, y })
        setModalOpen(true)
        setIsPlacing(false)
    }

    const handlePost = async (author: string, body: string) => {
        if (!pendingLoc || cooldown) return
        setIsSubmitting(true)

        try {
            const { error } = await supabase.from('pins').insert({
                x: pendingLoc.x,
                y: pendingLoc.y,
                author_name: author || 'Anonymous',
                body,
            })

            if (error) throw error

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
                // Calculate target position
                // We want the pin at center.
                // transformRef.current.instance.transformState gives current state.
                // But easier: use zoomToImage? No, setTransform.
                // We need the dimensions of the content.
                // Since we don't track content size easily here without a ref to the image,
                // we can assume the image is scaled to fit initially, but we entered with `centerOnInit`.
                // Let's iterate: zoomToElement is easier IF the element is correctly placed.
                // The user said "ViewLocation is off". This implies the pin placement might be slightly off due to size?
                // The pin is 0x0 div with the icon centered?
                // Let's use `zoomToElement` but ensure the target is the pin's anchor.
                // Actually, `zoomToElement` centers the element in the view.
                // If the pin div is width=0 height=0, it should be exact.

                // Let's try explicit setTransform with retry.
                // We can get the wrapper bounds.
                setTimeout(() => {
                    if (!transformRef.current) return
                    const { wrapperComponent, contentComponent } = transformRef.current.instance
                    if (!wrapperComponent || !contentComponent) return

                    const wrapperRect = wrapperComponent.getBoundingClientRect()
                    const contentRect = contentComponent.getBoundingClientRect()

                    // Target scale
                    const scale = 2

                    // Pin relative coords (0-1) -> Rendered Px (relative to content)
                    // The contentComponent IS the scalable area.
                    // The pin is at pin.x * contentRect.width, pin.y * contentRect.height
                    // logic: -x * scale + wrapper/2

                    // But wait, contentRect includes current scale.
                    // We need unscaled dims.
                    const unscaledWidth = contentRect.width / transformRef.current.instance.transformState.scale
                    const unscaledHeight = contentRect.height / transformRef.current.instance.transformState.scale

                    const targetX = pin.x * unscaledWidth
                    const targetY = pin.y * unscaledHeight

                    // Center in wrapper
                    const x = (wrapperRect.width / 2) - (targetX * scale)
                    const y = (wrapperRect.height / 2) - (targetY * scale)

                    transformRef.current.setTransform(x, y, scale, 500)
                    setSelectedPin(pin) // Also open the detail view
                }, 500)
            }
        }
    }, [highlightId, pins])

    return (
        <main style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#f5f5f5' }}>

            {/* Top Bar / Controls */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 50, display: 'flex', gap: '10px' }}>
                <Link href="/home" className="btn" style={{ background: 'white', color: 'black', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                    <List size={20} style={{ marginRight: 8 }} />
                    List
                </Link>
                <label className="btn" style={{ background: 'white', color: 'black', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', cursor: isUploading ? 'wait' : 'pointer', opacity: isUploading ? 0.7 : 1 }}>
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} disabled={isUploading} />
                    {isUploading ? 'Uploading...' : 'Upload Poster'}
                </label>
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

                            {pins.map((pin) => (
                                <div key={pin.id} id={`pin-${pin.id}`} style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0 }}>
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

            {/* Selected Pin Detail View */}
            {selectedPin && (
                <div className="modal-overlay" onClick={() => setSelectedPin(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Comment by {selectedPin.author_name}</h3>
                        <p style={{ margin: '0 0 16px 0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{selectedPin.body}</p>
                        <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '16px' }}>
                            {new Date(selectedPin.created_at).toLocaleString()}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button className="btn" style={{ background: '#e5e5e5', color: 'black' }} onClick={() => setSelectedPin(null)}>
                                Close
                            </button>
                            <button className="btn" style={{ background: '#ef4444', color: 'white' }} onClick={() => handleDelete(selectedPin.id)}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
