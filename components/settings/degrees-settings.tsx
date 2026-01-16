"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { useToast } from "@/hooks/use-toast"
import { cleanupDialogEffects } from "@/lib/dialog-utils"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase"

// Cache key
const DEGREES_CACHE_KEY = "admin_degrees_cache"
const CACHE_EXPIRY = 60 * 60 * 1000 // 1 hour

interface DegreeFormData {
  id?: string
  name: string
  nameRu: string
  code: string
  status: string
}

export function DegreesSettings() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const supabase = getSupabaseBrowserClient()
  
  // Initialize from cache synchronously to prevent flicker
  const [degrees, setDegrees] = useState<any[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const cached = localStorage.getItem(DEGREES_CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_EXPIRY && data && Array.isArray(data)) {
          // Normalize the data to ensure code field is always present
          return data.map((degree: any) => ({
            id: degree.id?.toString() || "",
            name: degree.name || "",
            nameRu: degree.name_ru || degree.nameRu || "",
            code: degree.code ?? "", // Use nullish coalescing to handle null/undefined
            status: degree.status || "active",
          }))
        }
      }
    } catch (error) {
      console.error("Error loading cached degrees in initializer:", error)
    }
    return []
  })
  
  const [filteredDegrees, setFilteredDegrees] = useState<any[]>(degrees)
  const [isLoadingDegrees, setIsLoadingDegrees] = useState(() => {
    if (typeof window === "undefined") return true
    try {
      const cached = localStorage.getItem(DEGREES_CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_EXPIRY && data && Array.isArray(data) && data.length > 0) {
          return false // Already have cached data, not loading
        }
      }
    } catch (error) {
      // Ignore errors in initializer
    }
    return true
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentDegree, setCurrentDegree] = useState<DegreeFormData>({
    name: "",
    nameRu: "",
    code: "",
    status: "active",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const isMounted = useRef(true)
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // First, add a new state variable for the delete confirmation dialog after the other state declarations (around line 50)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [degreeToDelete, setDegreeToDelete] = useState<string | null>(null)

  // Component lifecycle management
  useEffect(() => {
    isMounted.current = true

    return () => {
      isMounted.current = false

      // Clear any pending timeouts
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current)
      }

      // Force cleanup on unmount
      cleanupDialogEffects()
    }
  }, [])

  // Sync filteredDegrees with degrees when degrees change (from cache or fetch)
  // This ensures filteredDegrees is always in sync with degrees when no search is active
  // Also normalize the data to ensure code field is always present
  useEffect(() => {
    if (!searchTerm) {
      // Normalize degrees to ensure code field is always present
      const normalized = degrees.map((degree: any) => ({
        ...degree,
        code: degree.code ?? "", // Ensure code is always a string
      }))
      setFilteredDegrees(normalized)
    }
  }, [degrees, searchTerm])

  // Fetch degrees from Supabase
  useEffect(() => {
    const fetchDegrees = async () => {
      if (!isLoadingDegrees) {
        return
      }

      try {
        const { data, error } = await supabase
          .from("degrees")
          .select("id, name, name_ru, code, status")
          .order("name", { ascending: true })

        if (error) throw error

        const formattedDegrees = (data || []).map((degree) => ({
          id: degree.id?.toString() || "",
          name: degree.name || "",
          nameRu: degree.name_ru || "",
          code: degree.code ?? "", // Use nullish coalescing to handle null/undefined
          status: degree.status || "active",
        }))

        setDegrees(formattedDegrees)
        setFilteredDegrees(formattedDegrees)

        // Cache the degrees data
        localStorage.setItem(
          DEGREES_CACHE_KEY,
          JSON.stringify({
            data: formattedDegrees,
            timestamp: Date.now(),
          }),
        )
      } catch (error: any) {
        console.error("Error fetching degrees:", error)
        toast({
          title: t("admin.degrees.error"),
          description: error.message || t("admin.degrees.errorFetching"),
          variant: "destructive",
        })
      } finally {
        setIsLoadingDegrees(false)
      }
    }

    fetchDegrees()
  }, [supabase, toast, t, isLoadingDegrees])

  // Filter degrees based on search term
  useEffect(() => {
    if (!searchTerm) {
      // Normalize degrees to ensure code field is always present
      const normalized = degrees.map((degree: any) => ({
        ...degree,
        code: degree.code ?? "", // Ensure code is always a string
      }))
      setFilteredDegrees(normalized)
      return
    }

    if (degrees.length === 0) {
      setFilteredDegrees([])
      return
    }

    const filtered = degrees
      .map((degree: any) => ({
        ...degree,
        code: degree.code ?? "", // Normalize code field
      }))
      .filter(
        (degree) =>
          (degree.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (degree.nameRu || "").toLowerCase().includes(searchTerm.toLowerCase()),
      )

    setFilteredDegrees(filtered)
  }, [searchTerm, degrees])

  // Set up real-time subscriptions for instant updates
  useEffect(() => {
    console.log("Setting up real-time subscription for degrees")
    const channel = supabase
      .channel("degrees-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "degrees" },
        (payload) => {
          console.log("Real-time update received for degrees:", payload.eventType, payload.new?.id || payload.old?.id)
          // Invalidate cache and refetch
          localStorage.removeItem(DEGREES_CACHE_KEY)
          setIsLoadingDegrees(true)
        },
      )
      .subscribe()

    return () => {
      console.log("Cleaning up degrees real-time subscription")
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Function to safely open the dialog
  const handleOpenDialog = (degree?: (typeof degrees)[0]) => {
    // Ensure body is in normal state before opening dialog
    cleanupDialogEffects()

    if (degree) {
      setCurrentDegree(degree)
      setIsEditing(true)
    } else {
      setCurrentDegree({
        name: "",
        nameRu: "",
        code: "",
        status: "active",
      })
      setIsEditing(false)
    }

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      if (isMounted.current) {
        setIsDialogOpen(true)
      }
    }, 50)
  }

  // Function to safely close the dialog
  const handleCloseDialog = () => {
    if (isMounted.current) {
      setIsDialogOpen(false)

      // Schedule cleanup after animation completes
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current)
      }

      cleanupTimeoutRef.current = setTimeout(() => {
        cleanupDialogEffects()
      }, 300) // 300ms should be enough for most animations
    }
  }

  // Update the handleCloseDeleteDialog function to be more robust

  // Add this new function after the handleCloseDialog function (around line 200)
  const handleCloseDeleteDialog = () => {
    if (isMounted.current) {
      setIsDeleteDialogOpen(false)
      setDegreeToDelete(null)

      // Schedule cleanup after animation completes
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current)
      }

      cleanupTimeoutRef.current = setTimeout(() => {
        if (isMounted.current) {
          cleanupDialogEffects()
        }
      }, 300) // 300ms should be enough for most animations
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCurrentDegree({
      ...currentDegree,
      [name]: value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      if (isEditing) {
        // Update existing degree
        const { error } = await supabase
          .from("degrees")
          .update({
            name: currentDegree.name,
            name_ru: currentDegree.nameRu,
            code: currentDegree.code,
            status: currentDegree.status,
          })
          .eq("id", currentDegree.id)

        if (error) throw error

        // Update local state immediately to preserve all fields
        if (isMounted.current) {
          const updatedDegrees = degrees.map((d) =>
            d.id === currentDegree.id
              ? {
                  ...d,
                  name: currentDegree.name,
                  nameRu: currentDegree.nameRu,
                  code: currentDegree.code ?? "",
                  status: currentDegree.status,
                }
              : d,
          )
          setDegrees(updatedDegrees)

          // Update cache with the new data
          localStorage.setItem(
            DEGREES_CACHE_KEY,
            JSON.stringify({
              data: updatedDegrees,
              timestamp: Date.now(),
            }),
          )

          toast({
            title: t("admin.degrees.success"),
            description: t("admin.settings.degrees.updateSuccess"),
          })
        }
      } else {
        // Add new degree
        const { data, error } = await supabase
          .from("degrees")
          .insert({
            name: currentDegree.name,
            name_ru: currentDegree.nameRu,
            code: currentDegree.code,
            status: currentDegree.status,
          })
          .select()

        if (error) throw error

        if (data && data[0] && isMounted.current) {
          // Add new degree to local state immediately
          const newDegree = {
            id: data[0].id.toString(),
            name: data[0].name,
            nameRu: data[0].name_ru || "",
            code: data[0].code ?? "",
            status: data[0].status || "active",
          }
          const updatedDegrees = [...degrees, newDegree]
          setDegrees(updatedDegrees)

          // Update cache with the new data
          localStorage.setItem(
            DEGREES_CACHE_KEY,
            JSON.stringify({
              data: updatedDegrees,
              timestamp: Date.now(),
            }),
          )

          toast({
            title: t("admin.degrees.success"),
            description: t("admin.settings.degrees.addSuccess"),
          })
        }
      }

      handleCloseDialog()
    } catch (error: any) {
      console.error("Error saving degree:", error)
      if (isMounted.current) {
        toast({
          title: t("admin.degrees.error"),
          description: error.message || t("admin.degrees.errorSaving"),
          variant: "destructive",
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Replace the handleDelete function with this new implementation (around line 250)

  const handleDelete = (id: string) => {
    setDegreeToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  // Update the confirmDelete function to use the new handleCloseDeleteDialog function
  const confirmDelete = async () => {
    if (!degreeToDelete) return

    try {
      const { error } = await supabase.from("degrees").delete().eq("id", degreeToDelete)

      if (error) throw error

      if (isMounted.current) {
        // Remove degree from local state immediately
        const updatedDegrees = degrees.filter((d) => d.id !== degreeToDelete)
        setDegrees(updatedDegrees)

        // Update cache with the new data
        localStorage.setItem(
          DEGREES_CACHE_KEY,
          JSON.stringify({
            data: updatedDegrees,
            timestamp: Date.now(),
          }),
        )

        toast({
          title: t("admin.degrees.success"),
          description: t("admin.degrees.deleteSuccess"),
        })
      }
    } catch (error: any) {
      console.error("Error deleting degree:", error)
      if (isMounted.current) {
        toast({
          title: t("admin.degrees.error"),
          description: error.message || t("admin.degrees.errorDeleting"),
          variant: "destructive",
        })
      }
    } finally {
      // Use the new function to safely close the dialog
      handleCloseDeleteDialog()
    }
  }

  const toggleStatus = async (id: string) => {
    try {
      const degree = degrees.find((d) => d.id === id)
      if (!degree) return

      const newStatus = degree.status === "active" ? "inactive" : "active"

      const { error } = await supabase.from("degrees").update({ status: newStatus }).eq("id", id)

      if (error) throw error

      if (isMounted.current) {
        // Update local state immediately to preserve all fields including code
        const updatedDegrees = degrees.map((d) =>
          d.id === id
            ? {
                ...d,
                status: newStatus,
                code: d.code ?? "", // Preserve code field
              }
            : d,
        )
        setDegrees(updatedDegrees)

        // Update cache with the new data
        localStorage.setItem(
          DEGREES_CACHE_KEY,
          JSON.stringify({
            data: updatedDegrees,
            timestamp: Date.now(),
          }),
        )

        toast({
          title: t("admin.degrees.success"),
          description: t("admin.degrees.statusUpdated"),
        })
      }
    } catch (error: any) {
      console.error("Error updating status:", error)
      if (isMounted.current) {
        toast({
          title: t("admin.degrees.error"),
          description: error.message || t("admin.degrees.errorUpdatingStatus"),
          variant: "destructive",
        })
      }
    }
  }

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
            {t(`admin.degrees.${status}`)}
          </Badge>
        )
      case "inactive":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200">
            {t(`admin.degrees.${status}`)}
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("admin.degrees.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("admin.degrees.subtitle")}</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.degrees.addDegree")}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("admin.degrees.searchDegrees")}
                className="pl-8 max-w-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.degrees.name", "Name")}</TableHead>
                    <TableHead>{t("admin.degrees.status")}</TableHead>
                    <TableHead className="w-[80px]">{t("admin.degrees.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingDegrees && degrees.length === 0 ? (
                    <TableSkeleton columns={3} rows={5} />
                  ) : filteredDegrees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          {t("admin.degrees.noDegreesFound")}
                        </TableCell>
                      </TableRow>
                  ) : (
                    filteredDegrees.map((degree) => (
                      <TableRow key={degree.id}>
                        <TableCell className="font-medium">
                          {language === "ru" && degree.nameRu ? degree.nameRu : degree.name}
                        </TableCell>
                        <TableCell>{getStatusBadge(degree.status || "active")}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDialog(degree)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t("admin.degrees.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(degree.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t("admin.degrees.delete")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleStatus(degree.id)}>
                                {degree.status === "active"
                                  ? t("admin.degrees.deactivate")
                                  : t("admin.degrees.activate")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Only render dialog when it's open to avoid issues */}
      {isDialogOpen && (
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseDialog()
            }
          }}
        >
          <DialogContent
            className="sm:max-w-[500px]"
            onEscapeKeyDown={() => handleCloseDialog()}
            onInteractOutside={() => handleCloseDialog()}
            onPointerDownOutside={(e) => {
              e.preventDefault()
              handleCloseDialog()
            }}
          >
            <DialogHeader>
              <DialogTitle>{isEditing ? t("admin.degrees.editDegree") : t("admin.degrees.addNewDegree")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("admin.degrees.nameEn")}</Label>
                  <Input id="name" name="name" value={currentDegree.name} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameRu">{t("admin.degrees.nameRu")}</Label>
                  <Input id="nameRu" name="nameRu" value={currentDegree.nameRu} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">{t("admin.degrees.code")}</Label>
                  <Input id="code" name="code" value={currentDegree.code} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">{t("admin.degrees.status")}</Label>
                  <select
                    id="status"
                    name="status"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    value={currentDegree.status}
                    onChange={(e) => setCurrentDegree({ ...currentDegree, status: e.target.value })}
                  >
                    <option value="active">{t("admin.degrees.active")}</option>
                    <option value="inactive">{t("admin.degrees.inactive")}</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCloseDialog()
                  }}
                >
                  {t("admin.degrees.cancel")}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? t("admin.degrees.updating") || "Updating..." : t("admin.degrees.creating") || "Creating..."}
                    </>
                  ) : (
                    isEditing ? t("admin.degrees.update") : t("admin.degrees.create")
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {/* Add the delete confirmation dialog at the end of the component, just before the final closing tag (around line 500) */}

      {/* Update the Delete Confirmation Dialog to use the new handleCloseDeleteDialog function
      // Replace the entire Dialog component at the end of the file with this: */}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDeleteDialog()
          }
        }}
      >
        <DialogContent
          className="sm:max-w-[425px]"
          onEscapeKeyDown={(e) => {
            e.preventDefault()
            handleCloseDeleteDialog()
          }}
          onPointerDownOutside={(e) => {
            e.preventDefault()
          }}
          onInteractOutside={(e) => {
            e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("admin.degrees.deleteConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">{t("admin.degrees.deleteConfirmMessage")}</p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleCloseDeleteDialog()
              }}
            >
              {t("admin.degrees.deleteConfirmCancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                confirmDelete()
              }}
            >
              {t("admin.degrees.deleteConfirmDelete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
