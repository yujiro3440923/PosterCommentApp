
'use client'

import React from 'react'
import { MapPin } from 'lucide-react'

interface PinProps {
    x: number // 0-1
    y: number // 0-1
    isHighlighted?: boolean
    onClick?: () => void
    color?: string
}

export function PinMarker({ x, y, isHighlighted, onClick, color = '#ef4444' }: PinProps) {
    return (
        <div
            className={`pin ${isHighlighted ? 'highlighted' : ''}`}
            style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
            }}
            onClick={(e) => {
                e.stopPropagation()
                onClick?.()
            }}
        >
            <MapPin
                fill={isHighlighted ? '#fbbf24' : color}
                color="#fff"
                size={32}
                strokeWidth={2}
            />
        </div>
    )
}
