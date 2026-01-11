"use client"

import { useState, useEffect, useCallback } from "react"

export function useDialogState(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState)

  // Function to open the dialog
  const openDialog = useCallback(() => {
    setIsOpen(true)
  }, [])

  // Function to close the dialog
  const closeDialog = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Effect to handle cleanup when component unmounts
  useEffect(() => {
    // Cleanup function to ensure body scrolling is restored
    return () => {
      // Remove any classes that might have been added to the body
      document.body.classList.remove("overflow-hidden")

      // Remove any inline styles that might have been added
      const bodyStyle = document.body.style
      bodyStyle.removeProperty("overflow")
      bodyStyle.removeProperty("padding-right")
    }
  }, [])

  // Effect to manage body scrolling when dialog is open
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling on the body when dialog is open
      document.body.style.overflow = "hidden"
    } else {
      // Restore scrolling when dialog is closed
      document.body.style.overflow = ""
    }
  }, [isOpen])

  return {
    isOpen,
    openDialog,
    closeDialog,
    setIsOpen,
  }
}
