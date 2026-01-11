"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, File, Trash2, Download, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { uploadFile, deleteFile } from "@/lib/file-utils"

interface DocumentUploadProps {
  bucketName: string
  folderPath: string
  allowedFileTypes?: string[]
  maxFileSizeMB?: number
  onUploadComplete?: (file: { name: string; url: string; path: string }) => void
  onDeleteComplete?: (path: string) => void
  existingFiles?: Array<{ name: string; url: string; path: string }>
}

export function DocumentUpload({
  bucketName,
  folderPath,
  allowedFileTypes = [".pdf", ".doc", ".docx"],
  maxFileSizeMB = 5,
  onUploadComplete,
  onDeleteComplete,
  existingFiles = [],
}: DocumentUploadProps) {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`
    if (allowedFileTypes.length > 0 && !allowedFileTypes.includes(fileExtension)) {
      setError(`Invalid file type. Allowed types: ${allowedFileTypes.join(", ")}`)
      toast({
        title: "Invalid file type",
        description: `Please upload one of the following file types: ${allowedFileTypes.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    // Validate file size
    const maxSizeBytes = maxFileSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      setError(`File size exceeds the maximum limit of ${maxFileSizeMB}MB`)
      toast({
        title: "File too large",
        description: `Please upload a file smaller than ${maxFileSizeMB}MB`,
        variant: "destructive",
      })
      return
    }

    setError(null)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Create a unique file name to prevent collisions
      const timestamp = Date.now()
      const fileName = `${timestamp}_${file.name.replace(/\s+/g, "_")}`
      const filePath = `${folderPath}/${fileName}`

      // Upload the file with progress tracking
      const { url, path } = await uploadFile(bucketName, filePath, file, (progress) => {
        setUploadProgress(progress)
      })

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Call the callback with the uploaded file info
      if (onUploadComplete) {
        onUploadComplete({
          name: file.name,
          url,
          path,
        })
      }

      toast({
        title: "Upload complete",
        description: `${file.name} has been uploaded successfully.`,
      })
    } catch (error) {
      console.error("Error uploading file:", error)
      setError("Failed to upload file. Please try again.")
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (path: string, name: string) => {
    try {
      await deleteFile(path)

      if (onDeleteComplete) {
        onDeleteComplete(path)
      }

      toast({
        title: "File deleted",
        description: `${name} has been deleted successfully.`,
      })
    } catch (error) {
      console.error("Error deleting file:", error)
      toast({
        title: "Deletion failed",
        description: "There was an error deleting the file. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="document-upload">Upload Document</Label>
        <div className="flex items-center gap-2">
          <Input
            id="document-upload"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isUploading}
            accept={allowedFileTypes.join(",")}
            className="flex-1"
          />
          <Button disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm mt-1">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Allowed file types: {allowedFileTypes.join(", ")} (Max size: {maxFileSizeMB}MB)
        </p>
      </div>

      {isUploading && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{Math.round(uploadProgress)}%</p>
        </div>
      )}

      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Documents</h4>
          <div className="grid gap-2">
            {existingFiles.map((file, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => window.open(file.url, "_blank")}
                      >
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(file.path, file.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
