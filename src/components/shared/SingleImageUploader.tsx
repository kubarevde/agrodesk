import { ImageUploader, type UploadFolder } from './ImageUploader'

type SingleImageUploaderProps = {
  value: string | null
  onChange: (url: string | null) => void
  folder: UploadFolder
  className?: string
}

export function SingleImageUploader({
  value,
  onChange,
  folder,
  className,
}: SingleImageUploaderProps) {
  return (
    <ImageUploader
      value={value ? [value] : []}
      onChange={(urls) => onChange(urls[0] ?? null)}
      maxFiles={1}
      folder={folder}
      className={className}
    />
  )
}
