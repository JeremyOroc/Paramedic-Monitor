'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'

type RoomCodeCopyProps = {
  code: string
  className?: string
}

async function copyText(value: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.className = 'fixed -left-[9999px] top-0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

export function RoomCodeCopy({ code, className }: RoomCodeCopyProps) {
  const normalizedCode = code.toUpperCase()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await copyText(normalizedCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className={cn(
        'inline-flex items-stretch border border-cyan-bp/70 bg-black font-mono',
        className,
      )}
    >
      <span className="select-all px-3 py-2 text-sm font-black uppercase tracking-wider text-cyan-bp">
        {normalizedCode}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="border-l border-cyan-bp/50 px-3 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-cyan-bp hover:text-black"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}
