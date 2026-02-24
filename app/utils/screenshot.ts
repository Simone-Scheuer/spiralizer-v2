/**
 * Trigger a browser download of a PNG image from a data URL.
 */
export function downloadPNG(dataURL: string, filename?: string): void {
  const link = document.createElement('a')
  link.download = filename ?? `uzumaki-${Date.now()}.png`
  link.href = dataURL
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
