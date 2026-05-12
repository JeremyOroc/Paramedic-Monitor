let _ctx: AudioContext | null = null
let _buffer: AudioBuffer | null = null
// Pre-fetch raw bytes at module load — no user gesture needed for fetch
let _rawPromise: Promise<ArrayBuffer | null> | null = null

if (typeof window !== 'undefined') {
  _rawPromise = fetch('/audio/button_click.mp3')
    .then((r) => r.arrayBuffer())
    .catch(() => null)
}

function _play(): void {
  if (!_ctx || !_buffer) return
  const source = _ctx.createBufferSource()
  source.buffer = _buffer
  source.connect(_ctx.destination)
  source.start(0)
}

export function playButtonClick(): void {
  if (typeof window === 'undefined') return

  // AudioContext created on first user gesture — starts in running state
  if (!_ctx) {
    _ctx = new AudioContext()
    // Decode from pre-fetched bytes, then play
    _rawPromise?.then((raw) => {
      if (!raw || !_ctx) return _ctx?.decodeAudioData(new ArrayBuffer(0))
      return _ctx.decodeAudioData(raw)
    }).then((buf) => {
      if (buf) {
        _buffer = buf
        _play()
      }
    }).catch(() => {})
    return
  }

  if (_ctx.state === 'suspended') {
    _ctx.resume().then(() => _play()).catch(() => {})
    return
  }

  _play()
}
