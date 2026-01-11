export enum UserRole {
  STUDENT = "student",
  PROGRAM_MANAGER = "program_manager",
  ADMIN = "admin",
}

export enum Degree {
  BACHELOR = "bachelor",
  MASTER = "master",
  PHD = "phd",
}

export enum Semester {
  FALL = "fall",
  SPRING = "spring",
}

export enum SelectionStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum ElectivePackStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  CLOSED = "closed",
  ARCHIVED = "archived",
}

export interface DegreeType {
  id: number
  name: string
  code: string
}
