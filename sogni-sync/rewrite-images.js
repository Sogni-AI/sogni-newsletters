/**
 * Usage:
 *   node rewrite-images.js <html-file>
 *
 * This script:
 * 1. Reads the specified HTML file.
 * 2. Extracts image URLs (png, jpg, jpeg, gif) from <img> tags.
 * 3. Downloads the images to the ./assets/ folder, preserving folder structure (skips existing files).
 * 4. Rewrites image paths in the HTML to point to the ./assets/ folder.
 * 5. Creates a backup "<file>.orig.html" and then overwrites the original HTML file with updated content.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ASSETS_FOLDER = './assets';

// Create the assets folder if it doesn't exist
if (!fs.existsSync(ASSETS_FOLDER)) {
  fs.mkdirSync(ASSETS_FOLDER);
}

// Function to ensure directory exists
const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Function to download a file
const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file).on('finish', () => {
          file.close(resolve);
        });
      } else {
        reject(new Error(`Failed to download: ${url} (Status: ${response.statusCode})`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
};

// Main function to process the HTML file
const processHtmlFile = async (filePath) => {
  try {
    // 1) Create a backup file first: "original.html" -> "original.orig.html"
    const backupFilePath = filePath.replace(/(\.\w+)$/, '.orig$1');
    fs.copyFileSync(filePath, backupFilePath);
    console.log(`Backup created at: ${backupFilePath}`);

    // 2) Load original HTML
    let htmlContent = fs.readFileSync(filePath, 'utf8');

    // Regex to match image URLs including png, jpg/jpeg, gif
    const imageRegex = /<img[^>]+src=["']([^"']+\.(png|jpe?g|gif))["']/gi;

    let match;
    const downloads = [];

    // Process all image URLs
    while ((match = imageRegex.exec(htmlContent)) !== null) {
      const imageUrl = match[1];

      // Skip already relative URLs (i.e. URLs that do not start with http:// or https://)
      if (!/^https?:\/\//i.test(imageUrl)) {
        console.log(`Skipping relative URL: ${imageUrl}`);
        continue;
      }

      const urlPath = new URL(imageUrl).pathname;
      const localPath = path.join(ASSETS_FOLDER, urlPath);
      const dirPath = path.dirname(localPath);

      // Ensure directory structure exists
      ensureDirExists(dirPath);

      // Check if the file already exists
      if (fs.existsSync(localPath)) {
        console.log(`File already exists: ${localPath}`);
      } else {
        // Download the image if it doesn't exist
        downloads.push(
          downloadFile(imageUrl, localPath)
            .then(() => {
              console.log(`Downloaded: ${imageUrl} -> ${localPath}`);
            })
            .catch((err) => console.error(`Error downloading ${imageUrl}:`, err))
        );
      }

      // Replace the URL in the HTML to point to the assets folder
      htmlContent = htmlContent.replace(imageUrl, `assets${urlPath}`);
    }

    // 3) Wait for all downloads to complete
    await Promise.all(downloads);

    // 4) Overwrite the original file with updated content
    fs.writeFileSync(filePath, htmlContent, 'utf8');
    console.log(`Updated HTML saved to: ${filePath}`);
  } catch (err) {
    console.error('Error processing HTML file:', err);
  }
};

// Check for command-line arguments
if (process.argv.length < 3) {
  console.error('Usage: node rewrite-images.js <html-file>');
  process.exit(1);
}

// Run the script
const inputFile = process.argv[2];
processHtmlFile(inputFile);
