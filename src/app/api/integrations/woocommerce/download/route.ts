/**
 * WooCommerce Plugin Download
 * 
 * GET /api/integrations/woocommerce/download
 * 
 * Returns the plugin ZIP file for download.
 * Requires authentication.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import JSZip from 'jszip';

// Plugin files to include in the ZIP
const PLUGIN_FILES = [
  'sails-tax.php',
  'readme.txt',
  'includes/class-sails-tax-api.php',
  'includes/class-sails-tax-calculator.php',
  'includes/class-sails-tax-settings.php',
  'assets/js/admin.js',
  'assets/css/admin.css',
];

export async function GET() {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create ZIP file
    const zip = new JSZip();
    const pluginFolder = zip.folder('sails-tax-for-woocommerce');
    
    if (!pluginFolder) {
      throw new Error('Failed to create ZIP folder');
    }

    // Base path for plugin files
    const basePath = join(process.cwd(), 'integrations', 'woocommerce', 'sails-tax-for-woocommerce');
    
    // Add each file to the ZIP
    for (const filePath of PLUGIN_FILES) {
      const fullPath = join(basePath, filePath);
      
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, 'utf-8');
        pluginFolder.file(filePath, content);
      }
    }

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    // Return as downloadable file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="sails-tax-for-woocommerce.zip"',
        'Content-Length': String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error('Plugin download error:', error);
    return NextResponse.json(
      { error: 'Failed to generate plugin download' },
      { status: 500 }
    );
  }
}
