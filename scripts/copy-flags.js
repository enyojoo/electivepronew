#!/usr/bin/env node

/**
 * Script to copy flag SVG files from flag-icons package to public directory
 * This ensures flags are available for Next.js Image component
 */

const fs = require('fs')
const path = require('path')

const sourceDir = path.join(__dirname, '../node_modules/flag-icons/flags/4x3')
const targetDir = path.join(__dirname, '../public/flags/4x3')

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
  console.log('Created directory:', targetDir)
}

// Copy all SVG files
try {
  const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.svg'))
  let copiedCount = 0
  
  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file)
    const targetPath = path.join(targetDir, file)
    fs.copyFileSync(sourcePath, targetPath)
    copiedCount++
  })
  
  console.log(`✅ Copied ${copiedCount} flag SVG files to ${targetDir}`)
} catch (error) {
  console.error('❌ Error copying flags:', error.message)
  process.exit(1)
}
