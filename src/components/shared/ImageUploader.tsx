import axios from 'axios'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { mediaUrl } from '@/lib/media'
import { cn } from '@/lib/utils'

export type UploadFolder = 'equipment' | 'implements' | 'sharing' | 'profile'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

type ImageUploaderProps = {
  value: string[]
  onChange: (urls: string[]) => void
  maxFiles?: number
  folder: UploadFolder
  className?: string
}

function uploadErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (Array.isArray(detail)) {
      const parts = detail.map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'msg' in item) return String(item.msg)
        return ''
      })
      const joined = parts.filter(Boolean).join('; ')
      if (joined) return joined
    }
  }
  return 'Не удалось загрузить фото'
}

export function ImageUploader({
  value,
  onChange,
  maxFiles = 5,
  folder,
  className,
}: ImageUploaderProps) {
  const [progress, setProgress] = useState<number | null>(null)
  const uploading = progress != null

  const uploadFile = useCallback(
    async (file: File, current: string[]) => {
      if (file.size > MAX_BYTES) {
        toast.error('Максимальный размер файла — 5 МБ')
        return current
      }
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)
      setProgress(0)
      try {
        const { data } = await api.post<{ url: string }>('/api/uploads/image', formData, {
          onUploadProgress: (event) => {
            if (!event.total) return
            setProgress(Math.round((event.loaded / event.total) * 100))
          },
        })
        const next = [...current, data.url].slice(0, maxFiles)
        onChange(next)
        return next
      } catch (error) {
        toast.error(uploadErrorMessage(error))
        return current
      } finally {
        setProgress(null)
      }
    },
    [folder, maxFiles, onChange],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT,
    maxFiles: Math.max(1, maxFiles - value.length),
    disabled: uploading || value.length >= maxFiles,
    onDrop: (files) => {
      const remaining = maxFiles - value.length
      const nextFiles = files.slice(0, remaining)
      void (async () => {
        let current = value
        for (const file of nextFiles) {
          current = await uploadFile(file, current)
        }
      })()
    },
    onDropRejected: () => {
      toast.error('Допустимы только JPEG, PNG или WebP до 5 МБ')
    },
  })

  return (
    <div className={cn('space-y-3', className)}>
      {value.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {value.map((url) => (
            <div
              key={url}
              className="relative overflow-hidden rounded-lg border border-border"
            >
              <img
                src={mediaUrl(url)}
                alt="Превью"
                className="h-28 w-full object-cover"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="absolute top-1.5 right-1.5 size-7 bg-background"
                onClick={() => onChange(value.filter((item) => item !== url))}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {value.length < maxFiles ? (
        <div
          {...getRootProps()}
          className={cn(
            'flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface text-sm text-muted-foreground',
            isDragActive && 'border-primary text-primary',
            uploading && 'pointer-events-none opacity-70',
          )}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ImagePlus className="size-5" />
          )}
          <span>{uploading ? 'Загрузка…' : 'JPEG, PNG или WebP до 5 МБ'}</span>
        </div>
      ) : null}

      {progress != null ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }} // dynamic upload progress width
          />
        </div>
      ) : null}
    </div>
  )
}
