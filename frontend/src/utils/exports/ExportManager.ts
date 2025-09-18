import { ExportHandler, ExportFormat, ExportResult, Protocol, ExportContext } from '@/contracts';
import JSZip from 'jszip';

export class ExportManager {
  private handlers: Map<string, ExportHandler> = new Map();

  /**
   * Register a new export handler
   */
  registerHandler(handler: ExportHandler): void {
    this.handlers.set(handler.format.id, handler);
  }

  /**
   * Get all available export formats
   */
  getAvailableFormats(): ExportFormat[] {
    return Array.from(this.handlers.values()).map(handler => handler.format);
  }

  /**
   * Get a specific export format by ID
   */
  getFormat(formatId: string): ExportFormat | undefined {
    return this.handlers.get(formatId)?.format;
  }

  /**
   * Get export handler by format ID
   */
  getHandler(formatId: string): ExportHandler | undefined {
    return this.handlers.get(formatId);
  }

  /**
   * Validate protocol for specific export format
   */
  async validateForExport(protocol: Protocol, formatId: string): Promise<{ valid: boolean; errors?: string[] }> {
    const handler = this.handlers.get(formatId);
    if (!handler) {
      return { valid: false, errors: [`Export format '${formatId}' not found`] };
    }

    if (handler.validate) {
      return handler.validate(protocol);
    }

    return { valid: true };
  }

  /**
   * Generate export content for a specific format
   */
  async generateExport(
    protocol: Protocol,
    formatId: string,
    context: ExportContext
  ): Promise<ExportResult> {
    const handler = this.handlers.get(formatId);
    if (!handler) {
      return {
        success: false,
        error: `Export format '${formatId}' not found`
      };
    }

    try {
      // Validate first if validator exists
      if (handler.validate) {
        const validation = handler.validate(protocol);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.errors?.join(', ') || 'Validation failed'
          };
        }
      }

      return await handler.generate(protocol, context);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }

  /**
   * Generate export and automatically download if successful
   */
  async exportAndDownload(
    protocol: Protocol,
    formatId: string,
    context: ExportContext
  ): Promise<ExportResult> {
    const result = await this.generateExport(protocol, formatId, context);

    if (result.success) {
      if (result.files && result.files.length > 1) {
        // Multi-file export - create zip
        await this.downloadMultipleFiles(result.files, `${protocol.name.toLowerCase().replace(/\s+/g, '_')}_export.zip`);
      } else if (result.blob && result.filename) {
        // Single file export
        this.downloadBlob(result.blob, result.filename);
      }
    }

    return result;
  }

  /**
   * Create and download zip file containing multiple files
   */
  private async downloadMultipleFiles(files: Array<{ content: string; filename: string; mimeType?: string }>, zipFilename: string): Promise<void> {
    const zip = new JSZip();

    // Add each file to the zip
    for (const file of files) {
      zip.file(file.filename, file.content);
    }

    // Generate zip blob and download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    this.downloadBlob(zipBlob, zipFilename);
  }

  /**
   * Helper method to trigger file download
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  }
}

// Create singleton instance
export const exportManager = new ExportManager();