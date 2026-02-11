import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Poster Comment App',
    description: 'Interactive poster commenting system',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
