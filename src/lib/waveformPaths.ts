import type { Etco2Waveform, Rhythm, Spo2Waveform } from '@/types/vitals'

export function ecgSrc(rhythm: Rhythm): string {
  return `/waveforms/ecg-${rhythm}.gif`
}

export function spo2WaveformSrc(wave: Spo2Waveform): string | undefined {
  return wave === 'off' ? undefined : `/waveforms/spo2-${wave}.gif`
}

export function etco2WaveformSrc(wave: Etco2Waveform): string | undefined {
  return wave === 'off' ? undefined : `/waveforms/etco2-${wave}.gif`
}
