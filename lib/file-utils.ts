import { supabase } from "@/lib/supabase"

export async function uploadLogo(file: File): Promise<string> {
  const fileExt = file.name.split(".").pop()
  const fileName = `logo_${Date.now()}.${fileExt}`
  const filePath = `${fileName}`

  console.log(`Uploading logo to path: ${filePath} in logos bucket`)

  try {
    // Get the authenticated user
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      throw new Error("No authenticated user found")
    }

    // Upload the file
    const { error } = await supabase.storage.from("logos").upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    })

    if (error) {
      console.error("Error uploading logo:", error)
      throw new Error(`Error uploading logo: ${error.message}`)
    }

    const { data } = supabase.storage.from("logos").getPublicUrl(filePath)
    console.log("Logo uploaded successfully, public URL:", data.publicUrl)

    return data.publicUrl
  } catch (error) {
    console.error("Unexpected error during logo upload:", error)
    throw error
  }
}

export async function uploadFavicon(file: File): Promise<string> {
  const fileExt = file.name.split(".").pop()
  const fileName = `favicon_${Date.now()}.${fileExt}`
  const filePath = `${fileName}`

  console.log(`Uploading favicon to path: ${filePath} in favicons bucket`)

  try {
    // Get the authenticated user
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      throw new Error("No authenticated user found")
    }

    // Upload the file
    const { error } = await supabase.storage.from("favicons").upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    })

    if (error) {
      console.error("Error uploading favicon:", error)
      throw new Error(`Error uploading favicon: ${error.message}`)
    }

    const { data } = supabase.storage.from("favicons").getPublicUrl(filePath)
    console.log("Favicon uploaded successfully, public URL:", data.publicUrl)

    return data.publicUrl
  } catch (error) {
    console.error("Unexpected error during favicon upload:", error)
    throw error
  }
}

export async function uploadFile(
  bucketName: string,
  filePath: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<{ url: string; path: string }> {
  try {
    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      throw error
    }

    // Since Supabase JS client doesn't provide real-time progress,
    // we'll simulate progress if a callback is provided
    if (onProgress) {
      const steps = 10
      for (let i = 1; i <= steps; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        onProgress((i / steps) * 100)
      }
    }

    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath)

    return { url: urlData.publicUrl, path: filePath }
  } catch (error) {
    console.error("Error uploading file:", error)
    throw error
  }
}

export async function uploadStatement(file: File, userId: string, packId: string): Promise<string> {
  try {
    // Create a file path in the statements folder
    const fileExt = file.name.split(".").pop()
    const fileName = `student_statements/${userId}_${packId}_${file.name}`

    // Upload the file to Supabase Storage using the documents bucket (same as managers)
    const { error } = await supabase.storage.from("documents").upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      throw error
    }

    // Get the public URL
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(fileName)

    return urlData.publicUrl
  } catch (error) {
    console.error("Error uploading file:", error)
    throw error
  }
}

export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) {
    throw new Error(`Error deleting file: ${error.message}`)
  }

  return true
}
