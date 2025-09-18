import { ExportHandler, ExportFormat, ExportResult, Protocol, ExportContext } from '@/contracts';

export class P4ExportHandler implements ExportHandler {
  format: ExportFormat = {
    id: 'p4',
    name: 'P4 Header Definition',
    description: 'Export protocol as P4 programming language header definition',
    fileExtension: 'p4',
    mimeType: 'text/plain',
    icon: 'mdi-router-network',
    supportsPreview: true,
    previewLanguage: 'c' // P4 syntax is similar to C
  };

  async generate(protocol: Protocol, context: ExportContext): Promise<ExportResult> {
    try {
      const formattedHeaderName = protocol.name.replace(/\s+/g, '');
      let p4Content = `header ${formattedHeaderName}_h {\n`;
      let fieldCount = 0;

      for (const field of protocol.fields) {
        // Skip encapsulation fields as they're not part of the header structure
        if (field.encapsulate) {
          continue;
        }

        if (field.is_variable_length) {
          if (!field.max_length || field.max_length === 0) {
            return {
              success: false,
              error: `Field '${field.display_name}' is variable length but has no max length specified`
            };
          }
          p4Content += `    varbit<${context.maxLengthToBits(field)}> ${this.sanitizeFieldName(field.id)};\n`;
        } else {
          p4Content += `    bit<${context.lengthToBits(field)}> ${this.sanitizeFieldName(field.id)};\n`;
        }
        fieldCount++;
      }

      if (fieldCount === 0) {
        return {
          success: false,
          error: 'No exportable fields found. Encapsulation fields are not included in P4 headers.'
        };
      }

      p4Content += '}';

      const blob = new Blob([p4Content], {
        type: this.format.mimeType + ';charset=utf-8',
      });

      return {
        success: true,
        content: p4Content,
        blob,
        filename: `${formattedHeaderName}.${this.format.fileExtension}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate P4 code'
      };
    }
  }

  validate(protocol: Protocol): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!protocol.name?.trim()) {
      errors.push('Protocol name is required for P4 export');
    }

    if (!protocol.fields || protocol.fields.length === 0) {
      errors.push('Protocol must have at least one field');
    }

    // Check for exportable fields (non-encapsulation)
    const exportableFields = protocol.fields?.filter(field => !field.encapsulate) || [];
    if (exportableFields.length === 0) {
      errors.push('No exportable fields found. Encapsulation fields cannot be exported to P4.');
    }

    // Validate variable length fields
    for (const field of protocol.fields || []) {
      if (field.encapsulate) continue;

      if (field.is_variable_length && (!field.max_length || field.max_length === 0)) {
        errors.push(`Field '${field.display_name}' is variable length but has no max length specified`);
      }

      // Check for valid field names (P4 identifier rules)
      if (!this.isValidP4Identifier(field.id)) {
        errors.push(`Field ID '${field.id}' is not a valid P4 identifier`);
      }
    }

    // Check protocol name for P4 validity
    const sanitizedName = protocol.name?.replace(/\s+/g, '');
    if (sanitizedName && !this.isValidP4Identifier(sanitizedName)) {
      errors.push('Protocol name contains invalid characters for P4 header name');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private sanitizeFieldName(fieldId: string): string {
    // Replace invalid characters with underscores and ensure it starts with letter or underscore
    let sanitized = fieldId.replace(/[^a-zA-Z0-9_]/g, '_');
    if (!/^[a-zA-Z_]/.test(sanitized)) {
      sanitized = '_' + sanitized;
    }
    return sanitized;
  }

  private isValidP4Identifier(identifier: string): boolean {
    // P4 identifiers must start with letter or underscore, followed by letters, digits, or underscores
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
  }
}
