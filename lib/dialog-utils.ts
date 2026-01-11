/**
 * Utility functions for managing dialogs and preventing UI freezing issues
 */

/**
 * Ensures that any lingering dialog-related DOM modifications are cleaned up
 * Call this function when experiencing UI freezing issues after dialog closes
 */
export function cleanupDialogEffects() {
  try {
    // Remove any dialog-related classes from the body
    document.body.classList.remove("overflow-hidden")
    document.body.classList.remove("fixed")
    document.body.classList.remove("inset-0")

    // Reset body styles that might have been modified by dialogs
    const bodyStyle = document.body.style
    bodyStyle.removeProperty("overflow")
    bodyStyle.removeProperty("padding-right")
    bodyStyle.removeProperty("position")
    bodyStyle.removeProperty("top")
    bodyStyle.removeProperty("left")
    bodyStyle.removeProperty("right")
    bodyStyle.removeProperty("bottom")
    bodyStyle.removeProperty("pointer-events")

    // Remove any lingering backdrop/overlay elements - SAFELY
    const overlays = document.querySelectorAll("[data-radix-portal], [role='dialog'], .fixed.inset-0")
    overlays.forEach((overlay) => {
      try {
        if (overlay.parentNode && overlay.parentElement) {
          overlay.parentNode.removeChild(overlay)
        }
      } catch (err) {
        console.log("Skipping overlay removal - already removed")
      }
    })

    // Force focus back to the document body to prevent focus trapping
    document.body.focus()

    // Reset tab index on body to ensure it can receive focus
    document.body.tabIndex = -1

    // Remove aria-hidden attributes that might have been added to the main content
    document.querySelectorAll("[aria-hidden='true']").forEach((el) => {
      el.removeAttribute("aria-hidden")
    })

    // Remove any event listeners that might be blocking clicks
    // This is a last resort and might not be necessary
    const clickBlocker = (e: Event) => {
      e.stopPropagation()
      document.removeEventListener("click", clickBlocker, true)
    }

    // Add and immediately remove to clear any existing handlers
    document.addEventListener("click", clickBlocker, true)
    document.removeEventListener("click", clickBlocker, true)

    // Force a small reflow/repaint
    void document.body.offsetHeight
  } catch (error) {
    console.error("Error during dialog cleanup:", error)
  }
}

/**
 * Attach this to your app's error boundary to automatically clean up dialog effects
 * when an error occurs
 */
export function handleDialogError(error: Error) {
  console.error("Dialog error occurred:", error)
  cleanupDialogEffects()
}
