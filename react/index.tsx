import { canUseDOM } from 'vtex.render-runtime'
import type { PixelMessage } from './typings/events'

export function handleEvents(e: PixelMessage) {
  switch (e.data.eventName) {
    case 'vtex:pageView': {
      const urlParams = new URLSearchParams(window.location.search)
      const queryParam = urlParams.get('query')

      if (!queryParam) {
        (window as any).InterfaceX?.close()
      }
      break
    }
    default:
      break
  }
}

if (canUseDOM) {
  window.addEventListener('message', handleEvents)
}
