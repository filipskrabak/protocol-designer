import { ExportHandler, ExportFormat, ExportResult, Protocol, ExportContext } from '@/contracts';

/**
 * Exports the protocol header SVG diagram as a raster PNG image.
 * Uses the browser-native SVG → Canvas → PNG pipeline — no external library needed.
 */
export class PngExportHandler implements ExportHandler {
  format: ExportFormat = {
    id: 'png',
    name: 'PNG Image',
    description: 'Export the protocol diagram as a raster PNG image',
    fileExtension: 'png',
    mimeType: 'image/png',
    icon: 'mdi-file-image',
    supportsPreview: false,
  };

  async generate(protocol: Protocol, context: ExportContext): Promise<ExportResult> {
    if (!context.svgWrapper) {
      return { success: false, error: 'SVG wrapper element is not available' };
    }

    const svg = context.svgWrapper.querySelector('svg');
    if (!svg) {
      return { success: false, error: 'SVG element not found in wrapper' };
    }

    try {
      const blob = await svgElementToPngBlob(svg as SVGSVGElement);
      return {
        success: true,
        blob,
        filename: `${protocol.name}.png`,
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'PNG conversion failed',
      };
    }
  }

  validate(protocol: Protocol): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!protocol.name?.trim()) {
      errors.push('Protocol name is required for PNG export');
    }
    if (!protocol.fields || protocol.fields.length === 0) {
      errors.push('Protocol must have at least one field');
    }
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }
}

/**
 * Converts an SVG DOM element to a PNG Blob using a hidden canvas.
 * Adds a white background so the diagram is readable on all viewers.
 */
function svgElementToPngBlob(svg: SVGSVGElement): Promise<Blob> {
  // Read the rendered size from the live element
  const rect = svg.getBoundingClientRect();
  const width = Math.ceil(rect.width) || 1200;
  const height = Math.ceil(rect.height) || 400;

  // Clone to avoid mutating the live DOM, then ensure explicit dimensions
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const svgStr = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not get 2D canvas context'));
        return;
      }
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
        'image/png',
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG as image'));
    };
    img.src = url;
  });
}
