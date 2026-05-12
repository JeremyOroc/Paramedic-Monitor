import '@testing-library/jest-dom'

// Mock HTMLAudioElement — jsdom's play() returns undefined but code calls .catch() on it
window.HTMLMediaElement.prototype.play = () => Promise.resolve()
window.HTMLMediaElement.prototype.pause = () => {}
