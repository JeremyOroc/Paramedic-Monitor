'use client'

import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

import { COLORS } from '@/lib/constants'
import { createRoomJoinUrl } from '@/lib/roomJoinUrl'

type RoomQrCodeProps = {
  code: string
}

export function RoomQrCode({ code }: RoomQrCodeProps) {
  const normalizedCode = code.trim().toUpperCase()
  const joinUrl = createRoomJoinUrl(normalizedCode)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const hideButtonRef = useRef<HTMLButtonElement>(null)
  const focusTargetRef = useRef<'generate' | 'hide' | null>(null)

  useEffect(() => {
    const focusTarget = focusTargetRef.current
    if (focusTarget === 'hide') hideButtonRef.current?.focus()
    if (focusTarget === 'generate') triggerRef.current?.focus()
    focusTargetRef.current = null
  }, [open])

  if (!open) {
    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          focusTargetRef.current = 'hide'
          setOpen(true)
        }}
        className="w-[202px] border border-cyan-bp px-3 py-2 font-mono text-[10px] font-black uppercase tracking-wider text-cyan-bp hover:bg-cyan-bp hover:text-black focus:outline-none focus:ring-2 focus:ring-cyan-bp"
      >
        Generate QR Code for Room
      </button>
    )
  }

  return (
    <section
      aria-label={`QR code to join Room ${normalizedCode}`}
      className="grid w-[202px] justify-items-center border border-cyan-bp/60 bg-black/60 p-3 text-center"
    >
      <h2 className="max-w-[176px] font-mono text-xs font-black uppercase tracking-wider text-cyan-bp">
        Scan to join Room {normalizedCode}
      </h2>
      <div className="mt-2 grid place-items-center bg-white">
        <QRCodeSVG
          value={joinUrl}
          size={176}
          level="M"
          marginSize={4}
          bgColor="white"
          fgColor={COLORS.bg}
          role="img"
          aria-label={`QR code for Room ${normalizedCode}`}
        />
      </div>
      <button
        ref={hideButtonRef}
        type="button"
        onClick={() => {
          focusTargetRef.current = 'generate'
          setOpen(false)
        }}
        className="mt-2 w-full border border-cyan-bp px-3 py-2 font-mono text-[10px] font-black uppercase tracking-wider text-cyan-bp hover:bg-cyan-bp hover:text-black focus:outline-none focus:ring-2 focus:ring-cyan-bp"
      >
        Hide QR code
      </button>
    </section>
  )
}
