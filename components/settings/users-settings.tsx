"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Badge } from "@/components/ui/badge"
import { Search, MoreHorizontal, Filter, AlertCircle, Trash2, Save, Plus, Loader2 } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useCachedUsers } from "@/hooks/use-cached-users"
import { useDataCache } from "@/lib/data-cache-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cleanupDialogEffects } from "@/lib/dialog-utils"
import { useDialogState } from "@/hooks/use-dialog-state"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { Label } from "@/components/ui/label"
import { UserRole } from "@/lib/types"
import { useCachedDegrees } from "@/hooks/use-cached-degrees"
import { useCachedGroups } from "@/hooks/use-cached-groups"

export function UsersSettings() {
  const { t, language } = useLanguage()
  const { toast } = useToast()
  const { users, isLoading, error, isInitialDataLoaded } = useCachedUsers()
  const { degrees } = useCachedDegrees()
  const { groups } = useCachedGroups()
  const { invalidateCache } = useDataCache()
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  // User deletion state
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const { isOpen: isDeleteDialogOpen, openDialog: openDeleteDialog, closeDialog: closeDeleteDialog } = useDialogState()
  const [isDeleting, setIsDeleting] = useState(false)

  // User edit state
  const { isOpen: isEditDialogOpen, openDialog: openEditDialog, closeDialog: closeEditDialog } = useDialogState()
  const [editingUser, setEditingUser] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [filteredGroups, setFilteredGroups] = useState<any[]>([])
  const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - i).toString())

  const supabase = getSupabaseBrowserClient()

  // Initialize filteredUsers with users data when it becomes available
  useEffect(() => {
    if (users && users.length > 0) {
      setFilteredUsers(users)
      setTotalPages(Math.ceil(users.length / itemsPerPage))
    }
  }, [users, itemsPerPage])

  // Filter users based on search term and filters
  useEffect(() => {
    if (!users || users.length === 0) return

    let result = [...users]

    if (searchTerm) {
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (roleFilter !== "all") {
      result = result.filter((user) => user.role === roleFilter)
    }

    if (statusFilter !== "all") {
      result = result.filter((user) => user.status === statusFilter)
    }

    setFilteredUsers(result)
    setTotalPages(Math.ceil(result.length / itemsPerPage))
    setCurrentPage(1) // Reset to first page when filters change
  }, [searchTerm, roleFilter, statusFilter, users])

  // Filter groups based on selected degree
  useEffect(() => {
    if (editingUser?.degreeId && groups && groups.length > 0) {
      const filtered = groups.filter((group) => group.degreeId === editingUser.degreeId)
      setFilteredGroups(filtered)

      // Reset group selection if current selection is not valid for new degree
      if (editingUser.groupId && !filtered.find((g) => g.id === editingUser.groupId)) {
        setEditingUser((prev) => ({ ...prev, groupId: "" }))
      }
    } else {
      setFilteredGroups([])
    }
  }, [editingUser?.degreeId, groups])

  // Get current page items
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredUsers.slice(startIndex, endIndex)
  }

  // Helper function to get role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">{t("admin.users.admin")}</Badge>
        )
      case "program_manager":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
            {t("admin.users.program_manager")}
          </Badge>
        )
      case "student":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">
            {t("admin.users.student")}
          </Badge>
        )
      default:
        return <Badge>{role}</Badge>
    }
  }

  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
            {t("admin.users.active")}
          </Badge>
        )
      case "inactive":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200">
            {t("admin.users.inactive")}
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  // Handle user status change
  const handleStatusChange = async (userId: string, newStatus: boolean) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_active: newStatus }).eq("id", userId)

      if (error) throw error

      // Update local state immediately
      const updatedUsers = users.map((user) => {
        if (user.id === userId) {
          return {
            ...user,
            status: newStatus ? "active" : "inactive",
          }
        }
        return user
      })

      // Update filtered users
      setFilteredUsers((prevFiltered) =>
        prevFiltered.map((user) => {
          if (user.id === userId) {
            return {
              ...user,
              status: newStatus ? "active" : "inactive",
            }
          }
          return user
        }),
      )

      // Invalidate the users cache
      invalidateCache("users", "all")

      toast({
        title: "Success",
        description: newStatus ? "User has been activated" : "User has been deactivated",
      })
    } catch (error: any) {
      console.error("Error updating user status:", error)
      toast({
        title: "Error",
        description: `Failed to update user status: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId)
    openDeleteDialog()
  }

  const handleCloseDeleteDialog = () => {
    closeDeleteDialog()
    setTimeout(() => {
      setUserToDelete(null)
      cleanupDialogEffects()
    }, 300)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", userToDelete)

      if (error) throw error

      // Update local state immediately
      const updatedFilteredUsers = filteredUsers.filter((user) => user.id !== userToDelete)
      setFilteredUsers(updatedFilteredUsers)

      // Invalidate the users cache
      invalidateCache("users", "all")

      toast({
        title: "Success",
        description: "User has been deleted successfully",
      })

      handleCloseDeleteDialog()
    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle opening edit dialog
  const handleEditUser = (userId: string) => {
    const userToEdit = users.find((user) => user.id === userId)
    if (userToEdit) {
      setEditingUser({
        id: userToEdit.id,
        name: userToEdit.name,
        email: userToEdit.email,
        role: userToEdit.role,
        status: userToEdit.status,
        degreeId: userToEdit.degreeId || "",
        groupId: userToEdit.groupId || "",
        year: userToEdit.year || "",
      })
      console.log("Editing user:", userToEdit)
      console.log("Available groups:", groups)
      console.log(
        "Filtered groups for degree:",
        groups.filter((g) => g.degreeId === userToEdit.degreeId),
      )
      openEditDialog()
    }
  }

  const handleCloseEditDialog = () => {
    closeEditDialog()
    setTimeout(() => {
      setEditingUser(null)
      cleanupDialogEffects()
    }, 300)
  }

  const handleEditInputChange = (field: string, value: string) => {
    setEditingUser((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSaveUser = async () => {
    if (!editingUser) return

    setIsSaving(true)
    try {
      const isNewUser = !editingUser.id

      if (isNewUser) {
        // Create new user via API
        const response = await fetch("/api/admin/invite-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: editingUser.email,
            name: editingUser.name,
            role: editingUser.role,
            degreeId: editingUser.degreeId || null,
            groupId: editingUser.groupId || null,
            year: editingUser.year || null,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to create user")
        }

        const data = await response.json()

        // Invalidate cache to trigger refetch
        invalidateCache("users", "all")

        toast({
          title: "Success",
          description: `User created successfully. Temporary password: ${data.tempPassword}. Please share this with the user - they should change it on first login.`,
        })
      } else {
        // Update existing user - profiles table only
        const profileUpdateData: any = {
          full_name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
          is_active: editingUser.status === "active",
          updated_at: new Date().toISOString(),
        }

        // Update profile
        const { error: profileError } = await supabase
          .from("profiles")
          .update(profileUpdateData)
          .eq("id", editingUser.id)

        if (profileError) throw profileError

        // Handle role-specific profile tables
        // Only save role-specific fields if the role requires them (form shows these fields)
        if (editingUser.role === UserRole.STUDENT) {
          // Update or create student_profiles - only save fields that exist in the form
          const studentProfileData: any = {
            profile_id: editingUser.id,
          }
          
          // Only include fields if they're provided (form shows these for students)
          if (editingUser.groupId !== undefined && editingUser.groupId !== "") {
            studentProfileData.group_id = editingUser.groupId
          } else {
            studentProfileData.group_id = null
          }
          
          if (editingUser.year !== undefined && editingUser.year !== "") {
            studentProfileData.enrollment_year = editingUser.year
          } else {
            studentProfileData.enrollment_year = null
          }

          const { error: studentProfileError } = await supabase
            .from("student_profiles")
            .upsert(studentProfileData, { onConflict: "profile_id" })

          if (studentProfileError) throw studentProfileError

          // Remove manager profile if it exists
          await supabase.from("manager_profiles").delete().eq("profile_id", editingUser.id)
        } else if (editingUser.role === UserRole.PROGRAM_MANAGER) {
          // For program managers, we need to find the program_id from degree_id
          // First, get the program_id from the degree
          let programId = null
          if (editingUser.degreeId) {
            const { data: programData } = await supabase
              .from("programs")
              .select("id")
              .eq("degree_id", editingUser.degreeId)
              .limit(1)

            if (programData && programData.length > 0) {
              programId = programData[0].id
            }
          }

          // Get academic_year_id from the year if provided
          let academicYearId = null
          if (editingUser.year) {
            // Find academic_year by year text and program_id
            if (programId) {
              const { data: academicYearData } = await supabase
                .from("academic_years")
                .select("id")
                .eq("program_id", programId)
                .eq("year", editingUser.year)
                .limit(1)

              if (academicYearData && academicYearData.length > 0) {
                academicYearId = academicYearData[0].id
              }
            }
          }

          // Update or create manager_profiles - only save fields that exist in the form
          const managerProfileData: any = {
            profile_id: editingUser.id,
          }
          
          // Only include fields if they're provided (form shows these for program managers)
          if (editingUser.degreeId !== undefined && editingUser.degreeId !== "") {
            managerProfileData.degree_id = editingUser.degreeId
            managerProfileData.program_id = programId
          } else {
            managerProfileData.degree_id = null
            managerProfileData.program_id = null
          }
          
          if (academicYearId) {
            managerProfileData.academic_year_id = academicYearId
          } else {
            managerProfileData.academic_year_id = null
          }

          const { error: managerProfileError } = await supabase
            .from("manager_profiles")
            .upsert(managerProfileData, { onConflict: "profile_id" })

          if (managerProfileError) throw managerProfileError

          // Remove student profile if it exists
          await supabase.from("student_profiles").delete().eq("profile_id", editingUser.id)
        } else {
          // For admin users, remove any student or manager profiles
          await supabase.from("student_profiles").delete().eq("profile_id", editingUser.id)
          await supabase.from("manager_profiles").delete().eq("profile_id", editingUser.id)
        }

        // Invalidate cache to trigger refetch
        invalidateCache("users", "all")

        toast({
          title: "Success",
          description: "User updated successfully",
        })
      }

      // Update local state immediately
      const updatedUsers = users.map((user) => {
        if (user.id === editingUser.id) {
          return {
            ...user,
            name: editingUser.name,
            email: editingUser.email,
            role: editingUser.role,
            status: editingUser.status,
            degreeId: editingUser.degreeId || "",
            groupId: editingUser.groupId || "",
            year: editingUser.year || "",
            // Update related display fields
            degreeName: degrees.find((d) => d.id === editingUser.degreeId)?.name || "",
            groupName: groups.find((g) => g.id === editingUser.groupId)?.name || "",
          }
        }
        return user
      })

      // Update filtered users
      setFilteredUsers(
        filteredUsers.map((user) => {
          if (user.id === editingUser.id) {
            return {
              ...user,
              name: editingUser.name,
              email: editingUser.email,
              role: editingUser.role,
              status: editingUser.status,
              degreeId: editingUser.degreeId || "",
              groupId: editingUser.groupId || "",
              year: editingUser.year || "",
              // Update related display fields
              degreeName: degrees.find((d) => d.id === editingUser.degreeId)?.name || "",
              groupName: groups.find((g) => g.id === editingUser.groupId)?.name || "",
            }
          }
          return user
        }),
      )

      // Invalidate the users cache
      invalidateCache("users", "all")

      toast({
        title: "Success",
        description: "User updated successfully",
      })

      handleCloseEditDialog()
    } catch (error: any) {
      console.error("Error updating user:", error)
      toast({
        title: "Error",
        description: `Failed to update user: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Show skeleton only for initial data load
  const showSkeleton = isLoading && !isInitialDataLoaded && (!users || users.length === 0)

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("admin.users.searchUsers")}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setEditingUser({
                  id: "",
                  name: "",
                  email: "",
                  role: UserRole.STUDENT,
                  status: "active",
                  degreeId: "",
                  groupId: "",
                  year: "",
                })
                openEditDialog()
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("admin.users.createUser") || "Create User"}
            </Button>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[130px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t("admin.users.role")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.users.allRoles")}</SelectItem>
                <SelectItem value="admin">{t("admin.users.admin")}</SelectItem>
                <SelectItem value="program_manager">{t("admin.users.program_manager")}</SelectItem>
                <SelectItem value="student">{t("admin.users.student")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t("admin.users.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.users.allStatus")}</SelectItem>
                <SelectItem value="active">{t("admin.users.active")}</SelectItem>
                <SelectItem value="inactive">{t("admin.users.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.users.name")}</TableHead>
                <TableHead>{t("admin.users.email")}</TableHead>
                <TableHead>{t("admin.users.role")}</TableHead>
                <TableHead>{t("admin.users.degree")}</TableHead>
                <TableHead>{t("admin.users.group")}</TableHead>
                <TableHead>{t("admin.users.year")}</TableHead>
                <TableHead>{t("admin.users.status")}</TableHead>
                <TableHead className="w-[80px]">{t("admin.users.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {showSkeleton ? (
                <TableSkeleton columns={8} rows={5} />
              ) : getCurrentPageItems().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {t("admin.users.noUsersFound") || "No users found"}
                  </TableCell>
                </TableRow>
              ) : (
                getCurrentPageItems().map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{user.degreeName}</TableCell>
                    <TableCell>{user.groupName}</TableCell>
                    <TableCell>{user.year}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(user.id)}>
                            {t("admin.users.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className={user.status === "active" ? "text-destructive" : "text-green-600"}
                            onClick={() => handleStatusChange(user.id, user.status !== "active")}
                          >
                            {user.status === "active" ? t("admin.users.deactivate") : t("admin.users.activate")}
                          </DropdownMenuItem>
                          {/* Only show delete option for non-admin users or if current admin is viewing other admin users */}
                          {(user.role !== "admin" ||
                            (user.role === "admin" &&
                              user.id !== users.find((u) => u.role === "admin" && u.status === "active")?.id)) && (
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("admin.users.delete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage > 1) setCurrentPage(currentPage - 1)
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={page === currentPage}
                    onClick={(e) => {
                      e.preventDefault()
                      setCurrentPage(page)
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                  }}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDeleteDialog()
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t("admin.users.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("admin.users.deleteConfirmMessage")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={handleCloseDeleteDialog} disabled={isDeleting}>
              {t("admin.users.cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <span className="mr-2">{t("admin.users.deleting")}</span>
                </>
              ) : (
                t("admin.users.confirmDelete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseEditDialog()
        }}
      >
        <DialogContent 
          className="sm:max-w-lg flex flex-col p-0 gap-0" 
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl">{editingUser?.id ? t("admin.users.edit") : (t("admin.users.createUser") || "Create User")}</DialogTitle>
            <DialogDescription className="mt-1.5">
              {editingUser?.id ? t("admin.settings.subtitle") : "Create a new user account. A temporary password will be generated."}
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="px-6 py-4">
              <div className="space-y-5">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">{t("admin.users.basicInfo") || "Basic Information"}</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name" className="text-sm font-medium">{t("admin.users.name")}</Label>
                      <Input
                        id="edit-name"
                        value={editingUser.name}
                        onChange={(e) => handleEditInputChange("name", e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-email" className="text-sm font-medium">{t("admin.users.email")}</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editingUser.email}
                        onChange={(e) => handleEditInputChange("email", e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-role" className="text-sm font-medium">{t("admin.users.role")}</Label>
                        <Select value={editingUser.role} onValueChange={(value) => handleEditInputChange("role", value)}>
                          <SelectTrigger id="edit-role" className="h-10">
                            <SelectValue placeholder={t("admin.users.role")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UserRole.STUDENT}>{t("admin.users.student")}</SelectItem>
                            <SelectItem value={UserRole.PROGRAM_MANAGER}>{t("admin.users.program_manager")}</SelectItem>
                            <SelectItem value={UserRole.ADMIN}>{t("admin.users.admin")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-status" className="text-sm font-medium">{t("admin.users.status")}</Label>
                        <Select value={editingUser.status} onValueChange={(value) => handleEditInputChange("status", value)}>
                          <SelectTrigger id="edit-status" className="h-10">
                            <SelectValue placeholder={t("admin.users.selectStatus")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">{t("admin.users.active")}</SelectItem>
                            <SelectItem value="inactive">{t("admin.users.inactive")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student-specific fields */}
                {editingUser.role === UserRole.STUDENT && (
                  <div className="space-y-4 pt-2 border-t">
                    <h3 className="text-sm font-semibold text-foreground">{t("admin.users.studentDetails") || "Student Details"}</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-degree" className="text-sm font-medium">{t("admin.users.degree")}</Label>
                        <Select
                          value={editingUser.degreeId || undefined}
                          onValueChange={(value) => handleEditInputChange("degreeId", value)}
                        >
                          <SelectTrigger id="edit-degree" className="h-10">
                            <SelectValue placeholder={t("admin.users.selectDegree")} />
                          </SelectTrigger>
                          <SelectContent>
                            {degrees.map((degree) => (
                              <SelectItem key={degree.id} value={degree.id.toString()}>
                                {degree.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-year" className="text-sm font-medium">{t("admin.users.year")}</Label>
                          <Select value={editingUser.year || undefined} onValueChange={(value) => handleEditInputChange("year", value)}>
                            <SelectTrigger id="edit-year" className="h-10">
                              <SelectValue placeholder={t("admin.users.selectYear")} />
                            </SelectTrigger>
                            <SelectContent>
                              {years.map((year) => (
                                <SelectItem key={year} value={year}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-group" className="text-sm font-medium">{t("admin.users.group")}</Label>
                          <Select
                            value={editingUser.groupId || undefined}
                            onValueChange={(value) => handleEditInputChange("groupId", value)}
                            disabled={!editingUser.degreeId || filteredGroups.length === 0}
                          >
                            <SelectTrigger id="edit-group" className="h-10">
                              <SelectValue placeholder={t("admin.users.group")} />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredGroups.length > 0 ? (
                                filteredGroups.map((group) => (
                                  <SelectItem key={group.id} value={group.id.toString()}>
                                    {group.name || group.displayName}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                  {t("admin.groups.noGroups")}
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Program Manager specific fields */}
                {editingUser.role === UserRole.PROGRAM_MANAGER && (
                  <div className="space-y-4 pt-2 border-t">
                    <h3 className="text-sm font-semibold text-foreground">{t("admin.users.managerDetails") || "Manager Details"}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-manager-degree" className="text-sm font-medium">{t("admin.users.degree")}</Label>
                        <Select
                          value={editingUser.degreeId || undefined}
                          onValueChange={(value) => handleEditInputChange("degreeId", value)}
                        >
                          <SelectTrigger id="edit-manager-degree" className="h-10">
                            <SelectValue placeholder={t("admin.users.selectDegree")} />
                          </SelectTrigger>
                          <SelectContent>
                            {degrees.map((degree) => (
                              <SelectItem key={degree.id} value={degree.id.toString()}>
                                {degree.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-manager-year" className="text-sm font-medium">{t("admin.users.year")}</Label>
                        <Select value={editingUser.year || undefined} onValueChange={(value) => handleEditInputChange("year", value)}>
                          <SelectTrigger id="edit-manager-year" className="h-10">
                            <SelectValue placeholder={t("admin.users.selectYear")} />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row justify-end gap-3 sm:justify-end flex-shrink-0 border-t px-6 py-4 bg-muted/50">
            <Button type="button" variant="outline" onClick={handleCloseEditDialog} disabled={isSaving} className="h-10">
              {t("admin.users.cancel")}
            </Button>
            <Button type="button" onClick={handleSaveUser} disabled={isSaving} className="h-10">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("settings.branding.saving")}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("settings.branding.save")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
