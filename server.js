const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: 'text/html', limit: '10mb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'HTML to Image Service is running',
    endpoints: {
      'POST /html-to-image': 'Convert HTML to image'
    }
  });
});

// HTML to Image conversion endpoint
app.post('/html-to-image', async (req, res) => {
  let browser;
  
  try {
    const { html, options = {} } = typeof req.body === 'string' 
      ? { html: req.body, options: {} }
      : req.body;

    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    // Launch browser with optimized settings for Render
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport size (default or from options)
    await page.setViewport({
      width: options.width || 1200,
      height: options.height || 800,
      deviceScaleFactor: options.deviceScaleFactor || 1
    });

    // Set content and wait for it to load
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000 
    });

    // Take screenshot
    const screenshot = await page.screenshot({
      type: options.format || 'png',
      quality: options.quality || 80,
      fullPage: options.fullPage !== false, // default to true
      encoding: 'base64'
    });

    await browser.close();

    // Return base64 image
    res.json({
      success: true,
      image: screenshot,
      format: options.format || 'png'
    });

  } catch (error) {
    console.error('Error converting HTML to image:', error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to convert HTML to image',
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`HTML to Image service running on port ${port}`);
});