"use client"

import type React from "react"
import { useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useDialogState } from "@/hooks/use-dialog-state"

interface SafeDialogProps {
  trigger?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export function SafeDialog({
  trigger,
  title,
  description,
  children,
  footer,
  open: controlledOpen,
  onOpenChange,
  className,
}: SafeDialogProps) {
  // Use internal state if not controlled externally
  const { isOpen, setIsOpen } = useDialogState(false)

  // Determine if we're using controlled or uncontrolled state
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : isOpen

  // Handle external open state changes
  useEffect(() => {
    if (isControlled && controlledOpen !== undefined) {
      setIsOpen(controlledOpen)
    }
  }, [controlledOpen, isControlled, setIsOpen])

  // Handle open state changes
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setIsOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  // Ensure dialog is closed when component unmounts
  useEffect(() => {
    return () => {
      if (!isControlled) {
        setIsOpen(false)
      }
    }
  }, [isControlled, setIsOpen])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger}
      <DialogContent className={className}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
