import { ExportHandler, ExportFormat, ExportResult, Protocol, ExportContext } from '@/contracts';
import xmlFormatter from 'xml-formatter';

export class SvgExportHandler implements ExportHandler {
  format: ExportFormat = {
    id: 'svg',
    name: 'Scalable Vector Graphics',
    description: 'Export protocol as a SVG with embedded metadata',
    fileExtension: 'svg',
    mimeType: 'image/svg+xml',
    icon: 'mdi-vector-arrange-below',
    supportsPreview: true,
    previewLanguage: 'xml'
  };

  async generate(protocol: Protocol, context: ExportContext): Promise<ExportResult> {
    if (!context.svgWrapper) {
      return {
        success: false,
        error: 'SVG wrapper element is not available'
      };
    }

    const svg = context.svgWrapper.querySelector('svg');
    if (!svg) {
      return {
        success: false,
        error: 'SVG element not found in wrapper'
      };
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svg);

      // Format the SVG for better preview readability
      const formattedSvgData = xmlFormatter(svgData, {
        indentation: '  ',
        filter: (node: any) => node.type !== 'Comment',
        collapseContent: true,
        lineSeparator: '\n'
      });

      const blob = new Blob([svgData], {
        type: this.format.mimeType + ';charset=utf-8',
      });

      return {
        success: true,
        content: formattedSvgData, // Use formatted content for preview
        blob,
        filename: `${protocol.name}.${this.format.fileExtension}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to serialize SVG'
      };
    }
  }

  validate(protocol: Protocol): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!protocol.name?.trim()) {
      errors.push('Protocol name is required for SVG export');
    }

    if (!protocol.fields || protocol.fields.length === 0) {
      errors.push('Protocol must have at least one field');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
