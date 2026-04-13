function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

/**
 * Composites the given photo with the Pawgroom branding frame for the
 * specified type ("before" or "after"). The photo is drawn first using
 * object-fit: cover semantics so it fills the canvas without empty space,
 * then the transparent frame PNG is overlaid on top.
 *
 * Returns a new JPEG File ready to be uploaded.
 */
export async function applyGroomingFrame(file: File, type: "before" | "after"): Promise<File> {
  const frameUrl = `/frames/${type}-frame.png`
  const objectUrl = URL.createObjectURL(file)
  try {
    const [frame, photo] = await Promise.all([
      loadImage(frameUrl),
      loadImage(objectUrl),
    ])

    const canvas = document.createElement("canvas")
    canvas.width = frame.naturalWidth
    canvas.height = frame.naturalHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Could not get 2D canvas context")

    // Draw photo with cover (center-crop) to fill canvas
    const scale = Math.max(canvas.width / photo.naturalWidth, canvas.height / photo.naturalHeight)
    const scaledW = photo.naturalWidth * scale
    const scaledH = photo.naturalHeight * scale
    const offsetX = (canvas.width - scaledW) / 2
    const offsetY = (canvas.height - scaledH) / 2
    ctx.drawImage(photo, offsetX, offsetY, scaledW, scaledH)

    // Draw frame overlay on top
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)

    return new Promise<File>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Canvas toBlob failed"))
          const framedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".jpg"),
            { type: "image/jpeg", lastModified: Date.now() },
          )
          resolve(framedFile)
        },
        "image/jpeg",
        0.92,
      )
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
