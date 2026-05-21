export interface CloudinarySignature {
  signature: string
  timestamp: number
  api_key: string
  cloud_name: string
  folder: string
}

export interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
}

interface CloudinaryErrorResponse {
  error?: { message?: string }
}

export async function uploadFileToCloudinary(
  file: File,
  sig: CloudinarySignature,
): Promise<CloudinaryUploadResult> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("api_key", sig.api_key)
  formData.append("timestamp", String(sig.timestamp))
  formData.append("signature", sig.signature)
  formData.append("folder", sig.folder)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloud_name}/auto/upload`,
    { method: "POST", body: formData },
  )

  const payload = (await response.json().catch(() => null)) as
    | (CloudinaryUploadResult & CloudinaryErrorResponse)
    | null

  if (!response.ok || !payload?.secure_url || !payload.public_id) {
    const message = payload?.error?.message ?? `Cloudinary upload failed (${response.status})`
    throw new Error(message)
  }

  return { secure_url: payload.secure_url, public_id: payload.public_id }
}
