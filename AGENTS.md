# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Sogni Newsletter Archive** - a static website that hosts HTML newsletters for the Sogni /Sync publication. The site serves as an archive of all newsletter editions with an index page showing thumbnail previews.

## Architecture

### Core Structure
- **Newsletter Files**: Numbered HTML files (1.html, 2.html, etc.) in both root and sogni-sync directories
- **Dual Directory System**: Root contains main files, sogni-sync directory contains synchronized versions
- **Asset Management**: Images downloaded and stored locally in assets/ directories
- **Static Site**: Pure HTML/CSS/JS with no build system or dependencies

### File Organization
```
├── index.html              # Main landing page
├── styles.css              # Main stylesheet
├── rewrite-images.js       # Image processing utility
├── sync.sh                 # Deployment script
├── N.html                  # Individual newsletter editions
└── sogni-sync/             # Synchronized version with assets/
    ├── N.html              # Newsletter copies
    ├── N.orig.html         # Original backups
    ├── assets/             # Downloaded images
    └── rewrite-images.js   # Copy of processing script
```

## Common Commands

### Process New Newsletter
```bash
# Download external images and rewrite HTML paths
node rewrite-images.js 15.html

# Or from sogni-sync directory
cd sogni-sync && node rewrite-images.js 15.html
```

### Deploy to Production
```bash
# Sync entire directory to server
./sync.sh
```

### Local Development
```bash
# No build process - open directly in browser
open index.html
```

## Development Workflow

### Adding New Newsletter
1. Create `N.html` file with newsletter HTML content
2. Run `node rewrite-images.js N.html` to localize images
3. Update `index.html` to add newsletter entry and thumbnail
4. Test locally by opening HTML files
5. Deploy with `./sync.sh`

### Image Processing System
The `rewrite-images.js` script:
- Downloads external images (png, jpg, jpeg, gif) to local `assets/` directory
- Rewrites image src paths in HTML to point to local assets
- Creates `.orig.html` backup files before modifying
- Preserves original URL folder structure in assets
- Skips files that already exist locally

## Technical Notes

### Dependencies
- **Node.js**: Required for image processing script
- **rsync**: Required for deployment (./sync.sh)
- **No package.json**: Pure static site with no npm dependencies

### Deployment
- Production server: `sogni-api:/var/www/news.sogni.ai/sogni-sync/`
- Uses rsync with archive mode and progress display
- Syncs entire directory structure including assets

### Styling
- Dark theme (#1D1D1D background) with green accent (#99FF01)
- Inter font family from Google Fonts
- Responsive grid layout for newsletter thumbnails
- Email-compatible CSS inherited from newsletter templates