export const PREDEFINED_GROUP_COLORS: Record<string, string> = {
  header: "#2196F3",      // Blue
  payload: "#4CAF50",     // Green
  footer: "#FF9800",      // Orange
  control: "#9C27B0",     // Purple
  address: "#F44336",     // Red
  checksum: "#795548",    // Brown
  flags: "#607D8B",       // Blue Grey
  length: "#FFC107",      // Amber
};

// Start with predefined options
const predefinedOptions = [
  { title: 'Header', value: 'header' },
  { title: 'Payload', value: 'payload' },
  { title: 'Footer', value: 'footer' },
  { title: 'Control', value: 'control' },
  { title: 'Address', value: 'address' },
  { title: 'Checksum', value: 'checksum' },
  { title: 'Flags', value: 'flags' },
  { title: 'Length', value: 'length' },
];

/**
 * Generate consistent color for custom group names using simple hash
 * @param groupId - The group identifier
 * @returns A color string (hex or hsl)
 */
export function generateGroupColor(groupId: string): string {
  if (PREDEFINED_GROUP_COLORS[groupId]) {
    return PREDEFINED_GROUP_COLORS[groupId];
  }

  // Simple hash function to generate consistent colors for custom groups
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    const char = groupId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Generate HSL color with fixed saturation and lightness for consistency
  const hue = Math.abs(hash) % 360;

  function hslToHex(h: number, s: number, l: number) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  return hslToHex(hue, 70, 50);
}

/**
 * Get all available group options with predefined groups and custom groups from fields
 * @param fields - Array of protocol fields
 * @returns Array of group options for dropdowns
 */
export function getGroupOptions(fields: any[] = []) {
  // Get unique custom groups from existing fields
  const existingGroups = new Set<string>();
  fields.forEach(field => {
    if (field.group_id && !PREDEFINED_GROUP_COLORS[field.group_id]) {
      existingGroups.add(field.group_id);
    }
  });

  // Add custom groups to options
  const customOptions = Array.from(existingGroups).map(groupId => ({
    title: `${groupId.charAt(0).toUpperCase()}${groupId.slice(1)} (custom)`,
    value: groupId
  }));

  return [...predefinedOptions, ...customOptions];
}

/**
 * Get group options for field editing (focused on common groups plus existing custom ones)
 * @param fields - Array of protocol fields
 * @returns Array of group options for field edit modal
 */
export function getFieldEditGroupOptions(fields: any[] = []) {
  // Get unique custom groups from existing fields
  const existingGroups = new Set<string>();
  fields.forEach(field => {
    if (field.group_id && field.group_id !== 'header' && field.group_id !== 'payload') {
      existingGroups.add(field.group_id);
    }
  });

  // Add custom groups to options
  const customOptions = Array.from(existingGroups).map(groupId => ({
    title: `${groupId.charAt(0).toUpperCase()}${groupId.slice(1)} (custom)`,
    value: groupId
  }));

  return [...predefinedOptions, ...customOptions];
}

/**
 * Convert hex color to RGBA string with specified opacity
 * @param hexColor - Hex color string (e.g., "#ff5733")
 * @param opacity - Opacity value between 0 and 1 (e.g., 0.08)
 * @returns RGBA string (e.g., "rgba(255, 87, 51, 0.08)")
 */
export function hexToRgba(hexColor: string, opacity: number): string {
  const rgbColor = hexColor.replace('#', '');
  const r = parseInt(rgbColor.substr(0, 2), 16);
  const g = parseInt(rgbColor.substr(2, 2), 16);
  const b = parseInt(rgbColor.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
