// lib/blob.ts
import { put, del } from '@vercel/blob'

export async function uploadFile(file: File, path: string) {
  const blob = await put(path, file, {
    access: 'public',
  })
  return blob.url
}

export async function deleteFile(url: string) {
  await del(url)
}