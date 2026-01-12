"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Trash2, Loader2 } from "lucide-react"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserRole } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import { createClient } from "@supabase/supabase-js"

export default function UserEditPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id
  const isNewUser = userId === "new"
  const { toast } = useToast()
  const { t, language } = useLanguage()
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  // Initialize all state variables with default values
  const [user, setUser] = useState({
    id: "",
    name: "",
    email: "",
    role: UserRole.STUDENT,
    status: "active",
    degreeId: "",
    groupId: "",
    year: "",
  })

  const [degrees, setDegrees] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [filteredGroups, setFilteredGroups] = useState<any[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

  // Helper function to get localized degree name
  const getLocalizedDegreeName = (degree: any) => {
    if (language === "ru" && degree.name_ru) {
      return degree.name_ru
    }
    return degree.name
  }

  // Fetch reference data (degrees, groups)
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        // Fetch degrees
        const { data: degreesData, error: degreesError } = await supabase
          .from("degrees")
          .select("id, name, name_ru")
          .eq("status", "active")

        if (degreesError) throw degreesError

        // Fetch groups
        const { data: groupsData, error: groupsError } = await supabase
          .from("groups")
          .select("id, name, degree_id, academic_year_id")
          .eq("status", "active")

        if (groupsError) throw groupsError

        setDegrees(degreesData)
        setGroups(groupsData || [])
      } catch (error) {
        console.error("Error fetching reference data:", error)
        toast({
          title: "Error",
          description: "Failed to load reference data",
          variant: "destructive",
        })
      }
    }

    fetchReferenceData()
  }, [supabase, toast])

  // Fetch user data if editing existing user
  useEffect(() => {
    const fetchUserData = async () => {
      if (isNewUser) {
        setIsLoading(false)
        return
      }

      try {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, is_active, degree_id, group_id, academic_year")
          .eq("id", userId)
          .single()

        if (profileError) throw profileError

        setUser({
          id: profileData.id,
          name: profileData.full_name || "",
          email: profileData.email || "",
          role: profileData.role,
          status: profileData.is_active ? "active" : "inactive",
          degreeId: profileData.degree_id || "",
          groupId: profileData.group_id || "",
          year: profileData.academic_year || "",
        })
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [isNewUser, userId, supabase, toast])

  // Filter groups based on selected degree
  useEffect(() => {
    if (user.degreeId) {
      const filtered = groups.filter((group) => group.degree_id === user.degreeId)
      setFilteredGroups(filtered)
      // Reset group selection if current selection is not valid for new degree
      if (!filtered.find((g) => g.id === user.groupId)) {
        setUser((prev) => ({ ...prev, groupId: "" }))
      }
    } else {
      setFilteredGroups([])
      setUser((prev) => ({ ...prev, groupId: "" }))
    }
  }, [user.degreeId, groups, user.groupId])

  const handleInputChange = (field: string, value: string | number) => {
    setUser((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      if (isNewUser) {
        // Redirect to settings/users tab for creating new users
        router.push("/admin/settings?tab=users")
        return
      }

      // Prepare update data
      const updateData: any = {
        full_name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.status === "active",
        updated_at: new Date().toISOString(),
      }

      // Add role-specific fields
      if (user.role === UserRole.STUDENT || user.role === UserRole.PROGRAM_MANAGER) {
        updateData.degree_id = user.degreeId || null
        updateData.academic_year = user.year || null
        updateData.group_id = user.groupId || null
      } else {
        // Clear these fields for admin users
        updateData.degree_id = null
        updateData.academic_year = null
        updateData.group_id = null
      }

      // Update profile
      const { error: updateError } = await supabase.from("profiles").update(updateData).eq("id", user.id)

      if (updateError) throw updateError

      toast({
        title: "Success",
        description: "User updated successfully",
      })

      // Redirect to users list
      router.push("/admin/users")
    } catch (error: any) {
      console.error("Error saving user:", error)
      toast({
        title: "Error",
        description: `Failed to save user: ${error.message}`,
        variant: "destructive",
      })
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout userRole={UserRole.ADMIN}>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Link href="/admin/users">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Loading...</h1>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="h-[400px] flex items-center justify-center">
                <p>Loading user data...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userRole={UserRole.ADMIN}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Link href="/admin/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {isNewUser ? "Create New User" : `Edit User: ${user.name}`}
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={user.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">User Role</Label>
                  <Select value={user.role} onValueChange={(value) => handleInputChange("role", value)}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.STUDENT}>Student</SelectItem>
                      <SelectItem value={UserRole.PROGRAM_MANAGER}>Program Manager</SelectItem>
                      <SelectItem value={UserRole.ADMIN}>Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={user.status} onValueChange={(value) => handleInputChange("status", value)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {user.role === UserRole.STUDENT && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="degreeId">{t("admin.users.degree")}</Label>
                    <Select value={user.degreeId} onValueChange={(value) => handleInputChange("degreeId", value)}>
                      <SelectTrigger id="degreeId">
                        <SelectValue placeholder={t("admin.users.selectDegree")} />
                      </SelectTrigger>
                      <SelectContent>
                        {degrees.map((degree) => (
                          <SelectItem key={degree.id} value={degree.id.toString()}>
                            {getLocalizedDegreeName(degree)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupId">{t("admin.users.group")}</Label>
                    <Select
                      value={user.groupId}
                      onValueChange={(value) => handleInputChange("groupId", value)}
                      disabled={!user.degreeId || filteredGroups.length === 0}
                    >
                      <SelectTrigger id="groupId">
                        <SelectValue placeholder={t("admin.users.selectGroup")} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {user.role === UserRole.STUDENT && (
                <div className="space-y-2">
                  <Label htmlFor="year">{t("admin.users.year")}</Label>
                  <Select value={user.year} onValueChange={(value) => handleInputChange("year", value)}>
                    <SelectTrigger id="year">
                      <SelectValue placeholder={t("admin.users.selectYear")} />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {user.role === UserRole.PROGRAM_MANAGER && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="managerDegree">Degree</Label>
                    <Select value={user.degreeId} onValueChange={(value) => handleInputChange("degreeId", value)}>
                      <SelectTrigger id="managerDegree">
                        <SelectValue placeholder="Select degree" />
                      </SelectTrigger>
                      <SelectContent>
                        {degrees.map((degree) => (
                          <SelectItem key={degree.id} value={degree.id.toString()}>
                            {getLocalizedDegreeName(degree)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="managerYear">Academic Year</Label>
                    <Select value={user.year} onValueChange={(value) => handleInputChange("year", value)}>
                      <SelectTrigger id="managerYear">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-between">
            <Button variant="outline" type="button" onClick={() => router.push("/admin/users")}>
              Cancel
            </Button>

            <div className="flex gap-2">
              {!isNewUser && (
                <Button variant="destructive" type="button">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete User
                </Button>
              )}

              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isNewUser ? "Create User" : "Save Changes"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
