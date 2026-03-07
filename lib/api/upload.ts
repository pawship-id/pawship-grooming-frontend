import { apiAuthRequest } from "./client"

export interface UploadFileResponse {
  message: string
  image_url: string
  public_id: string
}

export async function uploadFile(file: File, folder: string): Promise<UploadFileResponse> {
  const formData = new FormData()
  formData.append("image", file)
  formData.append("folder", folder)
  return apiAuthRequest<UploadFileResponse>(`/upload-file`, {
    method: "POST",
    body: formData,
  })
}
