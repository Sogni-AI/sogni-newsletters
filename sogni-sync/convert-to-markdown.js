const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Configuration
const INPUT_DIR = __dirname;
const OUTPUT_DIR = path.join(__dirname, 'markdown');

// Parse command line arguments
const args = process.argv.slice(2);
const FORCE_MODE = args.includes('--force');
const SPECIFIC_FILE = args.find(a => !a.startsWith('--'));

// Patterns to exclude
const EXCLUDE_SELECTORS = [
  '.preheader',
  '.social-media-container',
  '.social-icon',
  '[data-type="unsubscribe"]',
  '.unsubscribe-css__unsubscribe___2CDlR',
  '[data-type="spacer"]',
  '.footer-legal',
];

const EXCLUDE_TEXT_PATTERNS = [
  /missed a newsletter\?/i,
  /access all past editions/i,
  /WE&ROBOT PTE\. LTD\./i,
  /Privacy Policy & Terms/i,
  /Unsubscribe/i,
];

/**
 * Check if text should be excluded
 */
function shouldExcludeText(text) {
  if (!text || text.trim().length === 0) return true;
  return EXCLUDE_TEXT_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Clean and normalize text
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

/**
 * Convert HTML to Markdown
 */
function htmlToMarkdown($, element) {
  const $el = $(element);
  let result = '';

  $el.contents().each((_, node) => {
    if (node.type === 'text') {
      result += node.data;
    } else if (node.type === 'tag') {
      const $node = $(node);
      const tagName = node.name.toLowerCase();

      switch (tagName) {
        case 'strong':
        case 'b':
          result += `**${htmlToMarkdown($, node)}**`;
          break;
        case 'em':
        case 'i':
          result += `*${htmlToMarkdown($, node)}*`;
          break;
        case 'a':
          const href = $node.attr('href');
          const linkText = cleanText($node.text());
          if (href && linkText && !href.startsWith('{{{') && !href.includes('unsubscribe')) {
            result += `[${linkText}](${href})`;
          } else {
            result += linkText;
          }
          break;
        case 'br':
          result += '\n';
          break;
        case 'span':
          result += htmlToMarkdown($, node);
          break;
        case 'ul':
          $node.find('li').each((_, li) => {
            result += `\n- ${cleanText($(li).text())}`;
          });
          result += '\n';
          break;
        case 'ol':
          $node.find('li').each((i, li) => {
            result += `\n${i + 1}. ${cleanText($(li).text())}`;
          });
          result += '\n';
          break;
        case 'li':
          // Handled by ul/ol
          break;
        default:
          result += htmlToMarkdown($, node);
      }
    }
  });

  return result;
}

/**
 * Extract volume/date info from the newsletter
 */
function extractVolumeDate($) {
  // Look for pattern like "Jan '25 | Volume 01"
  const volumeRegex = /([A-Za-z]{3}\s*'?\d{2})\s*\|\s*(Volume\s*\d+)/i;

  // Search in table cells
  let volumeDate = null;
  $('td').each((_, td) => {
    const text = $(td).text();
    const match = text.match(volumeRegex);
    if (match) {
      volumeDate = `${match[1]} | ${match[2]}`;
      return false; // break
    }
  });

  return volumeDate;
}

/**
 * Extract main title
 */
function extractMainTitle($) {
  const mainTitle = $('.main-title').first();
  if (mainTitle.length) {
    return cleanText(mainTitle.text());
  }
  return null;
}

/**
 * Extract subtitle
 */
function extractSubtitle($) {
  const subtitle = $('.subtitle').first();
  if (subtitle.length) {
    return cleanText(subtitle.text());
  }
  return null;
}

/**
 * Process a content section
 */
function processSection($, sectionEl) {
  const lines = [];

  // Get section category (e.g., "NEW RELEASE", "FEATURE SPOTLIGHT")
  const sectionName = $(sectionEl).find('.section-name').first();
  if (sectionName.length) {
    const name = cleanText(sectionName.text());
    if (name && !shouldExcludeText(name)) {
      lines.push(`### ${name}`);
      lines.push('');
    }
  }

  // Get section title
  const sectionTitle = $(sectionEl).find('.section-title').first();
  if (sectionTitle.length) {
    const title = cleanText(sectionTitle.text());
    if (title && !shouldExcludeText(title)) {
      lines.push(`## ${title}`);
    }
  }

  // Get section subtitle
  const sectionSubtitle = $(sectionEl).find('.section-title-small').first();
  if (sectionSubtitle.length) {
    const subtitle = cleanText(sectionSubtitle.text());
    if (subtitle && !shouldExcludeText(subtitle)) {
      lines.push(`*${subtitle}*`);
    }
  }

  if (lines.length > 0) {
    lines.push('');
  }

  return lines;
}

/**
 * Extract text content from the newsletter
 */
function extractContent($) {
  const sections = [];

  // Remove excluded elements first
  EXCLUDE_SELECTORS.forEach(selector => {
    $(selector).remove();
  });

  // Also remove image-only elements
  $('img').remove();

  // Find all content containers
  const contentElements = [];

  // Collect section headers
  $('.section-name, .section-title, .section-title-small').each((_, el) => {
    contentElements.push({ type: 'header', el });
  });

  // Collect text blocks - look for divs with specific styling
  $('div[style*="font-family"]').each((_, el) => {
    const $el = $(el);
    // Skip if it's a parent of another matching element
    if ($el.find('div[style*="font-family"]').length === 0) {
      const text = cleanText($el.text());
      if (text.length > 20 && !shouldExcludeText(text)) {
        contentElements.push({ type: 'text', el });
      }
    }
  });

  // Also get .text-module content
  $('.text-module').each((_, el) => {
    const text = cleanText($(el).text());
    if (text.length > 20 && !shouldExcludeText(text)) {
      contentElements.push({ type: 'text', el });
    }
  });

  // Collect CTA buttons
  $('a[style*="border"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    const text = cleanText($el.text());
    if (href && text && !href.startsWith('{{{') && text.length < 50) {
      contentElements.push({ type: 'cta', el, href, text });
    }
  });

  return contentElements;
}

/**
 * Convert a newsletter HTML file to Markdown
 */
function convertNewsletter(inputPath) {
  const html = fs.readFileSync(inputPath, 'utf-8');
  const $ = cheerio.load(html);

  const lines = [];

  // Extract header info
  const volumeDate = extractVolumeDate($);
  const mainTitle = extractMainTitle($);
  const subtitle = extractSubtitle($);

  if (volumeDate) {
    lines.push(`*${volumeDate}*`);
    lines.push('');
  }

  if (mainTitle) {
    lines.push(`# ${mainTitle}`);
  }

  if (subtitle) {
    lines.push(`*${subtitle}*`);
  }

  if (mainTitle || subtitle) {
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Remove excluded elements
  EXCLUDE_SELECTORS.forEach(selector => {
    $(selector).remove();
  });

  // Track processed content to avoid duplicates
  const processedText = new Set();

  // Process content in document order
  $('body').find('*').each((_, el) => {
    const $el = $(el);
    const tagName = el.name?.toLowerCase();

    // Skip certain elements
    if (['script', 'style', 'head', 'meta', 'link', 'img', 'table'].includes(tagName)) {
      return;
    }

    // Section category header (e.g., "NEW RELEASE")
    if ($el.hasClass('section-name')) {
      const text = cleanText($el.text());
      if (text && !shouldExcludeText(text) && !processedText.has(text)) {
        processedText.add(text);
        lines.push(`### ${text}`);
        lines.push('');
      }
      return;
    }

    // Section title
    if ($el.hasClass('section-title')) {
      const text = cleanText($el.text());
      if (text && !shouldExcludeText(text) && !processedText.has(text)) {
        processedText.add(text);
        lines.push(`## ${text}`);
        lines.push('');
      }
      return;
    }

    // Section subtitle
    if ($el.hasClass('section-title-small')) {
      const text = cleanText($el.text());
      if (text && !shouldExcludeText(text) && !processedText.has(text)) {
        processedText.add(text);
        lines.push(`*${text}*`);
        lines.push('');
      }
      return;
    }

    // App headings (h3 with class app-heading)
    if ($el.hasClass('app-heading')) {
      const text = cleanText($el.text());
      if (text && !shouldExcludeText(text) && !processedText.has(text)) {
        processedText.add(text);
        lines.push(`**${text}**`);
        lines.push('');
      }
      return;
    }

    // H2 headers (newer newsletter format)
    if (tagName === 'h2' && !$el.hasClass('section-title')) {
      const text = cleanText($el.text());
      if (text && !shouldExcludeText(text) && !processedText.has(text)) {
        processedText.add(text);
        lines.push(`## ${text}`);
        lines.push('');
      }
      return;
    }

    // H3 headers (feature card titles in newer format)
    if (tagName === 'h3' && !$el.hasClass('app-heading')) {
      const text = cleanText($el.text());
      if (text && text.length > 3 && !shouldExcludeText(text) && !processedText.has(text)) {
        processedText.add(text);
        lines.push(`### ${text}`);
        lines.push('');
      }
      return;
    }

    // Text-module td elements (newer format)
    if (tagName === 'td' && $el.hasClass('text-module')) {
      const paragraphs = [];
      $el.find('p').each((_, p) => {
        const $p = $(p);
        const md = htmlToMarkdown($, p);
        const cleaned = cleanText(md);
        if (cleaned && cleaned.length > 10 && !shouldExcludeText(cleaned)) {
          paragraphs.push(cleaned);
        }
      });

      paragraphs.forEach(p => {
        if (!processedText.has(p)) {
          processedText.add(p);
          lines.push(p);
          lines.push('');
        }
      });
      return;
    }

    // Styled paragraphs (newer format - look for p tags with styled content)
    if (tagName === 'p') {
      const parentTd = $el.closest('td');
      const parentStyle = parentTd.attr('style') || '';
      const elStyle = $el.attr('style') || '';

      // Check if it's a content paragraph (has font styling or is in text-module)
      if ((elStyle.includes('font') || elStyle.includes('color') ||
           parentStyle.includes('font') || parentTd.hasClass('text-module')) &&
          !$el.closest('.footer-legal').length) {

        const md = htmlToMarkdown($, el);
        const text = cleanText(md);

        if (text && text.length > 15 && !shouldExcludeText(text) && !processedText.has(text)) {
          processedText.add(text);
          lines.push(text);
          lines.push('');
        }
      }
      return;
    }

    // Unordered lists (feature lists in newer format)
    if (tagName === 'ul') {
      const listItems = [];
      $el.find('> li').each((_, li) => {
        const md = htmlToMarkdown($, li);
        const text = cleanText(md);
        if (text && !shouldExcludeText(text)) {
          listItems.push(`- ${text}`);
        }
      });

      if (listItems.length > 0) {
        const listKey = listItems.join('|');
        if (!processedText.has(listKey)) {
          processedText.add(listKey);
          listItems.forEach(item => lines.push(item));
          lines.push('');
        }
      }
      return;
    }

    // Text content blocks - look for styled divs with actual content
    if (tagName === 'div') {
      const style = $el.attr('style') || '';
      if (style.includes('font-family') && style.includes('color')) {
        // Check this is a leaf node (no child divs with same styling)
        if ($el.find('div[style*="font-family"]').length === 0) {
          // Get HTML content to preserve formatting
          const htmlContent = $el.html();
          if (htmlContent) {
            const text = cleanText($el.text());
            if (text.length > 15 && !shouldExcludeText(text) && !processedText.has(text)) {
              processedText.add(text);

              // Convert to markdown
              const md = htmlToMarkdown($, el);
              const paragraphs = md.split(/\n{2,}/).map(p => cleanText(p)).filter(p => p && !shouldExcludeText(p));

              paragraphs.forEach(p => {
                lines.push(p);
                lines.push('');
              });
            }
          }
        }
      }
    }

    // CTA buttons (including gradient buttons in newer format)
    if (tagName === 'a') {
      const style = $el.attr('style') || '';
      const href = $el.attr('href') || '';

      // Check if it's a button-style link (border, padding, or background with border-radius)
      const isButton = (style.includes('border') && style.includes('padding')) ||
                       (style.includes('background') && style.includes('border-radius'));

      if (isButton) {
        const text = cleanText($el.text());
        const linkKey = `${text}:${href}`;

        if (text && href &&
            !href.startsWith('{{{') &&
            !href.includes('unsubscribe') &&
            !href.includes('RESEND_UNSUBSCRIBE') &&
            text.length < 50 &&
            !shouldExcludeText(text) &&
            !processedText.has(linkKey)) {
          processedText.add(linkKey);
          lines.push(`[${text}](${href})`);
          lines.push('');
        }
      }
    }
  });

  // Clean up extra blank lines
  let result = lines.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.trim() + '\n';

  return result;
}

/**
 * Generate output filename with zero-padded number
 */
function getOutputFilename(num) {
  const padded = String(num).padStart(2, '0');
  return `sogni_newsletter_${padded}.md`;
}

/**
 * Find all newsletter HTML files
 */
function findNewsletters() {
  const files = fs.readdirSync(INPUT_DIR);
  const newsletters = [];

  for (const file of files) {
    // Match files like "1.html", "18.html", "123.html"
    const match = file.match(/^(\d+)\.html$/);
    if (match) {
      const num = parseInt(match[1], 10);
      newsletters.push({
        num,
        inputFile: path.join(INPUT_DIR, file),
        outputFile: path.join(OUTPUT_DIR, getOutputFilename(num))
      });
    }
  }

  // Sort by number
  newsletters.sort((a, b) => a.num - b.num);
  return newsletters;
}

/**
 * Main function
 */
function main() {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }

  let newsletters;

  // Check if a specific file was requested
  if (SPECIFIC_FILE) {
    const num = parseInt(SPECIFIC_FILE.replace('.html', ''), 10);
    const inputFile = path.join(INPUT_DIR, `${num}.html`);
    const outputFile = path.join(OUTPUT_DIR, getOutputFilename(num));

    if (!fs.existsSync(inputFile)) {
      console.error(`File not found: ${inputFile}`);
      process.exit(1);
    }

    newsletters = [{ num, inputFile, outputFile }];
  } else {
    newsletters = findNewsletters();
  }

  if (newsletters.length === 0) {
    console.log('No newsletter HTML files found.');
    return;
  }

  let converted = 0;
  let skipped = 0;

  // Process each newsletter
  for (const { num, inputFile, outputFile } of newsletters) {
    // Skip if output already exists (unless force mode)
    if (!FORCE_MODE && fs.existsSync(outputFile)) {
      skipped++;
      continue;
    }

    try {
      const outName = path.basename(outputFile);
      console.log(`Converting ${num}.html...`);
      const markdown = convertNewsletter(inputFile);
      fs.writeFileSync(outputFile, markdown, 'utf-8');
      console.log(`  -> ${outName} (${markdown.length} chars)`);
      converted++;
    } catch (error) {
      console.error(`Error converting ${num}.html:`, error.message);
    }
  }

  console.log('');
  if (converted === 0 && skipped > 0) {
    console.log(`No new newsletters to convert (${skipped} already converted).`);
    console.log('Use --force to re-convert all.');
  } else {
    console.log(`Conversion complete! Converted: ${converted}, Skipped: ${skipped}`);
  }
}

main();
