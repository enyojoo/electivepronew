"use client"

import { useState, useRef } from "react"
import { Upload, X, File, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface ModernFileUploaderProps {
  onFileSelect: (file: File | null) => void
  selectedFile: File | null
  isUploading: boolean
  uploadProgress?: number
  accept?: string
  maxSize?: number // in MB
  className?: string
  title?: string
  description?: string
  existingFileUrl?: string
  existingFileName?: string
  onDeleteExisting?: () => void
}

export function ModernFileUploader({
  onFileSelect,
  selectedFile,
  isUploading,
  uploadProgress = 0,
  accept = ".pdf,.doc,.docx",
  maxSize = 10,
  className,
  title,
  description,
  existingFileUrl,
  existingFileName,
  onDeleteExisting,
}: ModernFileUploaderProps) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): boolean => {
    setError(null)

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`)
      return false
    }

    // Check file type
    const allowedTypes = accept.split(',').map(type => type.trim())
    const fileType = file.type
    const fileName = file.name.toLowerCase()

    const isValidType = allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileName.endsWith(type)
      }
      return fileType === type
    })

    if (!isValidType) {
      setError(`File type not allowed. Allowed types: ${accept}`)
      return false
    }

    return true
  }

  const handleFileSelect = (file: File | null) => {
    if (file && validateFile(file)) {
      onFileSelect(file)
    } else if (!file) {
      onFileSelect(null)
      setError(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemove = () => {
    handleFileSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div>
          {title && <h3 className="text-lg font-medium">{title}</h3>}
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}

      {existingFileUrl && !selectedFile ? (
        <div className="border rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <File className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium truncate">
                  {existingFileName || "Uploaded file"}
                </p>
                <span className="text-xs text-muted-foreground">
                  (existing file)
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              {onDeleteExisting && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteExisting()
                  }}
                  className="p-1 rounded-md hover:bg-destructive/10 text-destructive"
                  title="Delete existing file"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : !selectedFile && !existingFileUrl ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
            isUploading && "pointer-events-none opacity-50"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            className="hidden"
            disabled={isUploading}
          />

          <div className="flex flex-col items-center space-y-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Drop your file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports: {accept} (Max: {maxSize}MB)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {isUploading ? (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </span>
              </div>

              {isUploading && (
                <div className="mt-2">
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>

            {!isUploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="flex-shrink-0 h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}