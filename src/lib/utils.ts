import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const COLORS = {
  bg:           '#000000',
  ecgGreen:     '#00ff41',
  cyanBP:       '#00ffff',
  purpleEtCO2:  '#cc44ff',
  yellowSpO2:   '#ffff00',
  alarmRed:     '#ff2020',
  pendingAmber: '#ffaa00',
  bottomBar:    '#1a1a1a',
  sidebarBg:    '#0d0d0d',
  // 12-lead Capture printout (warm tan/salmon ECG paper, dark ink) + acquire bar
  printPaper:   '#f4dcc6',
  printGrid:    '#e0b193',
  printGridBold:'#d09a78',
  printInk:     '#161616',
  acquireGreen: '#7cc24a',
} as const
