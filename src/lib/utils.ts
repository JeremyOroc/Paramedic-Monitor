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
  selectionBlue: '#1f4cff',
  modalSurface:  '#8ba88c',
  bottomBar:    '#1a1a1a',
  sidebarBg:    '#0d0d0d',
  // 12-lead Capture printout (warm tan/salmon ECG paper, dark ink) + acquire bar
  printPaper:   '#f4dcc6',
  printGrid:    '#e0b193',
  printGridBold:'#d09a78',
  printInk:     '#161616',
  acquireGreen: '#7cc24a',
  dispatchWall: '#d8c799',
  dispatchSurface: '#c98243',
  dispatchPaper: '#f7f4ea',
  dispatchInk: '#151515',
  dispatchMuted: '#6f675c',
  dispatchAccent: '#c9a03c',
  dispatchBezel: '#080808',
  dispatchField: '#ece5d5',
  dispatchLine: '#d1c3a5',
  dispatchPanel: '#0b1117',
  dispatchPanelSoft: '#1d2833',
  dispatchBlue: '#1296e8',
  dispatchGreen: '#24d43b',
  dispatchRed: '#ff4055',
  dispatchOrange: '#ff7638',
  dispatchPurple: '#8c7be8',
  dispatchYellow: '#f2b51b',
} as const
