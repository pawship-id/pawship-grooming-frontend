import { apiAuthRequest } from "./client"

export interface UploadFileResponse {
  message: string
  image_url: string
  public_id: string
}

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

async function compressImage(file: File, quality = 0.7): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext("2d")
      if (!ctx) return reject(new Error("Failed to get canvas context"))
      ctx.drawImage(img, 0, 0)

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Failed to compress image"))
          resolve(new File([blob], file.name, { type: "image/jpeg" }))
        },
        "image/jpeg",
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load image for compression"))
    }

    img.src = url
  })
}

export async function uploadFile(file: File, folder: string): Promise<UploadFileResponse> {
  let fileToUpload = file

  if (file.size > MAX_SIZE_BYTES) {
    fileToUpload = await compressImage(file)
  }

  const formData = new FormData()
  formData.append("image", fileToUpload)
  formData.append("folder", folder)
  return apiAuthRequest<UploadFileResponse>(`/upload-file`, {
    method: "POST",
    body: formData,
  })
}
