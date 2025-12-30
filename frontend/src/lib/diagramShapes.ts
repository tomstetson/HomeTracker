/**
 * Diagram Shape Library
 * Pre-defined shapes and templates for home diagrams
 */

export interface DiagramShape {
  id: string;
  name: string;
  icon: string;
  category: string;
  svgPath?: string;
  emoji?: string;
  width: number;
  height: number;
  color: string;
  textColor: string;
}

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  shapes: TemplateShape[];
}

export interface TemplateShape {
  type: 'rect' | 'ellipse' | 'text' | 'arrow' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  props?: Record<string, any>;
}

// ========================================
// SHAPE CATEGORIES
// ========================================

export const SHAPE_CATEGORIES = [
  { id: 'basic', name: 'Basic Shapes', icon: '⬛' },
  { id: 'network', name: 'Network', icon: '🌐' },
  { id: 'furniture', name: 'Furniture', icon: '🛋️' },
  { id: 'appliances', name: 'Appliances', icon: '🏠' },
  { id: 'plumbing', name: 'Plumbing', icon: '🚿' },
  { id: 'electrical', name: 'Electrical', icon: '⚡' },
  { id: 'hvac', name: 'HVAC', icon: '❄️' },
  { id: 'outdoor', name: 'Outdoor', icon: '🌳' },
];

// ========================================
// SHAPE LIBRARY
// ========================================

export const DIAGRAM_SHAPES: DiagramShape[] = [
  // Basic Shapes
  { id: 'rectangle', name: 'Rectangle', icon: '⬜', category: 'basic', emoji: '⬜', width: 120, height: 80, color: '#E3F2FD', textColor: '#1565C0' },
  { id: 'square', name: 'Square', icon: '🟦', category: 'basic', emoji: '🟦', width: 80, height: 80, color: '#BBDEFB', textColor: '#1565C0' },
  { id: 'circle', name: 'Circle', icon: '⭕', category: 'basic', emoji: '⭕', width: 80, height: 80, color: '#E8F5E9', textColor: '#2E7D32' },
  { id: 'diamond', name: 'Diamond', icon: '🔷', category: 'basic', emoji: '🔷', width: 80, height: 80, color: '#FFF3E0', textColor: '#E65100' },
  { id: 'triangle', name: 'Triangle', icon: '🔺', category: 'basic', emoji: '🔺', width: 80, height: 70, color: '#FCE4EC', textColor: '#C2185B' },

  // Network Devices
  { id: 'router', name: 'Router', icon: '📡', category: 'network', emoji: '📡', width: 100, height: 60, color: '#E3F2FD', textColor: '#1565C0' },
  { id: 'switch', name: 'Switch', icon: '🔀', category: 'network', emoji: '🔀', width: 120, height: 40, color: '#E8F5E9', textColor: '#2E7D32' },
  { id: 'modem', name: 'Modem', icon: '📶', category: 'network', emoji: '📶', width: 80, height: 60, color: '#FFF3E0', textColor: '#E65100' },
  { id: 'access-point', name: 'Access Point', icon: '📻', category: 'network', emoji: '📻', width: 60, height: 60, color: '#E1F5FE', textColor: '#0277BD' },
  { id: 'server', name: 'Server', icon: '🖥️', category: 'network', emoji: '🖥️', width: 80, height: 100, color: '#ECEFF1', textColor: '#37474F' },
  { id: 'nas', name: 'NAS', icon: '💾', category: 'network', emoji: '💾', width: 80, height: 80, color: '#E0E0E0', textColor: '#424242' },
  { id: 'computer', name: 'Computer', icon: '💻', category: 'network', emoji: '💻', width: 80, height: 60, color: '#F3E5F5', textColor: '#7B1FA2' },
  { id: 'laptop', name: 'Laptop', icon: '💻', category: 'network', emoji: '💻', width: 70, height: 50, color: '#EDE7F6', textColor: '#512DA8' },
  { id: 'phone', name: 'Phone', icon: '📱', category: 'network', emoji: '📱', width: 40, height: 70, color: '#E0F2F1', textColor: '#00695C' },
  { id: 'tv', name: 'Smart TV', icon: '📺', category: 'network', emoji: '📺', width: 120, height: 70, color: '#263238', textColor: '#ECEFF1' },
  { id: 'printer', name: 'Printer', icon: '🖨️', category: 'network', emoji: '🖨️', width: 90, height: 60, color: '#FAFAFA', textColor: '#212121' },
  { id: 'camera', name: 'Camera', icon: '📷', category: 'network', emoji: '📷', width: 50, height: 50, color: '#FFEBEE', textColor: '#C62828' },
  { id: 'speaker', name: 'Smart Speaker', icon: '🔊', category: 'network', emoji: '🔊', width: 50, height: 70, color: '#E8EAF6', textColor: '#283593' },
  { id: 'thermostat', name: 'Thermostat', icon: '🌡️', category: 'network', emoji: '🌡️', width: 60, height: 60, color: '#E0F7FA', textColor: '#00838F' },
  { id: 'cloud', name: 'Cloud/Internet', icon: '☁️', category: 'network', emoji: '☁️', width: 100, height: 60, color: '#E3F2FD', textColor: '#1565C0' },
  { id: 'firewall', name: 'Firewall', icon: '🛡️', category: 'network', emoji: '🛡️', width: 80, height: 60, color: '#FFCDD2', textColor: '#C62828' },

  // Furniture
  { id: 'sofa', name: 'Sofa', icon: '🛋️', category: 'furniture', emoji: '🛋️', width: 180, height: 80, color: '#8D6E63', textColor: '#FFFFFF' },
  { id: 'chair', name: 'Chair', icon: '🪑', category: 'furniture', emoji: '🪑', width: 50, height: 50, color: '#A1887F', textColor: '#FFFFFF' },
  { id: 'table', name: 'Table', icon: '🪑', category: 'furniture', emoji: '🪑', width: 120, height: 60, color: '#BCAAA4', textColor: '#3E2723' },
  { id: 'bed-queen', name: 'Queen Bed', icon: '🛏️', category: 'furniture', emoji: '🛏️', width: 160, height: 200, color: '#D7CCC8', textColor: '#3E2723' },
  { id: 'bed-king', name: 'King Bed', icon: '🛏️', category: 'furniture', emoji: '🛏️', width: 190, height: 200, color: '#D7CCC8', textColor: '#3E2723' },
  { id: 'desk', name: 'Desk', icon: '🗄️', category: 'furniture', emoji: '🗄️', width: 140, height: 70, color: '#BCAAA4', textColor: '#3E2723' },
  { id: 'dresser', name: 'Dresser', icon: '🗄️', category: 'furniture', emoji: '🗄️', width: 120, height: 50, color: '#A1887F', textColor: '#FFFFFF' },
  { id: 'bookshelf', name: 'Bookshelf', icon: '📚', category: 'furniture', emoji: '📚', width: 100, height: 30, color: '#8D6E63', textColor: '#FFFFFF' },
  { id: 'dining-table', name: 'Dining Table', icon: '🍽️', category: 'furniture', emoji: '🍽️', width: 180, height: 100, color: '#BCAAA4', textColor: '#3E2723' },
  { id: 'coffee-table', name: 'Coffee Table', icon: '☕', category: 'furniture', emoji: '☕', width: 100, height: 50, color: '#D7CCC8', textColor: '#3E2723' },

  // Appliances
  { id: 'refrigerator', name: 'Refrigerator', icon: '🧊', category: 'appliances', emoji: '🧊', width: 80, height: 90, color: '#B0BEC5', textColor: '#263238' },
  { id: 'stove', name: 'Stove/Oven', icon: '🍳', category: 'appliances', emoji: '🍳', width: 75, height: 65, color: '#90A4AE', textColor: '#263238' },
  { id: 'dishwasher', name: 'Dishwasher', icon: '🍽️', category: 'appliances', emoji: '🍽️', width: 60, height: 60, color: '#B0BEC5', textColor: '#263238' },
  { id: 'washer', name: 'Washer', icon: '🧺', category: 'appliances', emoji: '🧺', width: 70, height: 70, color: '#CFD8DC', textColor: '#37474F' },
  { id: 'dryer', name: 'Dryer', icon: '🌀', category: 'appliances', emoji: '🌀', width: 70, height: 70, color: '#CFD8DC', textColor: '#37474F' },
  { id: 'microwave', name: 'Microwave', icon: '📦', category: 'appliances', emoji: '📦', width: 50, height: 35, color: '#78909C', textColor: '#FFFFFF' },
  { id: 'water-heater', name: 'Water Heater', icon: '🔥', category: 'appliances', emoji: '🔥', width: 50, height: 80, color: '#FFCCBC', textColor: '#BF360C' },

  // Plumbing
  { id: 'toilet', name: 'Toilet', icon: '🚽', category: 'plumbing', emoji: '🚽', width: 45, height: 65, color: '#ECEFF1', textColor: '#37474F' },
  { id: 'sink', name: 'Sink', icon: '🚰', category: 'plumbing', emoji: '🚰', width: 60, height: 45, color: '#ECEFF1', textColor: '#37474F' },
  { id: 'bathtub', name: 'Bathtub', icon: '🛁', category: 'plumbing', emoji: '🛁', width: 80, height: 170, color: '#ECEFF1', textColor: '#37474F' },
  { id: 'shower', name: 'Shower', icon: '🚿', category: 'plumbing', emoji: '🚿', width: 90, height: 90, color: '#E3F2FD', textColor: '#1565C0' },
  { id: 'pipe', name: 'Pipe', icon: '🔧', category: 'plumbing', emoji: '🔧', width: 100, height: 20, color: '#78909C', textColor: '#FFFFFF' },
  { id: 'valve', name: 'Valve', icon: '🔴', category: 'plumbing', emoji: '🔴', width: 40, height: 40, color: '#F44336', textColor: '#FFFFFF' },
  { id: 'water-main', name: 'Water Main', icon: '💧', category: 'plumbing', emoji: '💧', width: 60, height: 60, color: '#2196F3', textColor: '#FFFFFF' },

  // Electrical
  { id: 'outlet', name: 'Outlet', icon: '🔌', category: 'electrical', emoji: '🔌', width: 30, height: 40, color: '#FFF8E1', textColor: '#F57F17' },
  { id: 'switch-elec', name: 'Light Switch', icon: '💡', category: 'electrical', emoji: '💡', width: 30, height: 40, color: '#FFF8E1', textColor: '#F57F17' },
  { id: 'panel', name: 'Electrical Panel', icon: '⚡', category: 'electrical', emoji: '⚡', width: 60, height: 80, color: '#455A64', textColor: '#FFEB3B' },
  { id: 'ceiling-light', name: 'Ceiling Light', icon: '💡', category: 'electrical', emoji: '💡', width: 50, height: 50, color: '#FFEE58', textColor: '#F57F17' },
  { id: 'ceiling-fan', name: 'Ceiling Fan', icon: '🌀', category: 'electrical', emoji: '🌀', width: 60, height: 60, color: '#E0E0E0', textColor: '#424242' },
  { id: 'smoke-detector', name: 'Smoke Detector', icon: '🔔', category: 'electrical', emoji: '🔔', width: 40, height: 40, color: '#FFCDD2', textColor: '#C62828' },

  // HVAC
  { id: 'hvac-unit', name: 'HVAC Unit', icon: '❄️', category: 'hvac', emoji: '❄️', width: 100, height: 100, color: '#B3E5FC', textColor: '#01579B' },
  { id: 'vent', name: 'Vent', icon: '💨', category: 'hvac', emoji: '💨', width: 80, height: 20, color: '#CFD8DC', textColor: '#37474F' },
  { id: 'return-vent', name: 'Return Vent', icon: '🔄', category: 'hvac', emoji: '🔄', width: 60, height: 60, color: '#B0BEC5', textColor: '#37474F' },
  { id: 'thermostat-hvac', name: 'Thermostat', icon: '🌡️', category: 'hvac', emoji: '🌡️', width: 50, height: 50, color: '#E1F5FE', textColor: '#0277BD' },
  { id: 'furnace', name: 'Furnace', icon: '🔥', category: 'hvac', emoji: '🔥', width: 80, height: 80, color: '#FFCCBC', textColor: '#BF360C' },

  // Outdoor
  { id: 'tree', name: 'Tree', icon: '🌳', category: 'outdoor', emoji: '🌳', width: 60, height: 60, color: '#A5D6A7', textColor: '#1B5E20' },
  { id: 'shrub', name: 'Shrub', icon: '🌿', category: 'outdoor', emoji: '🌿', width: 50, height: 40, color: '#C8E6C9', textColor: '#2E7D32' },
  { id: 'fence', name: 'Fence', icon: '🏗️', category: 'outdoor', emoji: '🏗️', width: 100, height: 20, color: '#8D6E63', textColor: '#FFFFFF' },
  { id: 'gate', name: 'Gate', icon: '🚪', category: 'outdoor', emoji: '🚪', width: 60, height: 20, color: '#6D4C41', textColor: '#FFFFFF' },
  { id: 'pool', name: 'Pool', icon: '🏊', category: 'outdoor', emoji: '🏊', width: 200, height: 100, color: '#4FC3F7', textColor: '#01579B' },
  { id: 'patio', name: 'Patio', icon: '🏠', category: 'outdoor', emoji: '🏠', width: 150, height: 100, color: '#D7CCC8', textColor: '#3E2723' },
  { id: 'driveway', name: 'Driveway', icon: '🚗', category: 'outdoor', emoji: '🚗', width: 80, height: 200, color: '#9E9E9E', textColor: '#212121' },
  { id: 'garage', name: 'Garage', icon: '🚗', category: 'outdoor', emoji: '🚗', width: 200, height: 200, color: '#BDBDBD', textColor: '#212121' },
];

// ========================================
// PRE-BUILT TEMPLATES
// ========================================

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    id: 'home-network-basic',
    name: 'Basic Home Network',
    description: 'Simple home network with router, modem, and devices',
    category: 'network',
    thumbnail: '🌐',
    shapes: [
      { type: 'text', x: 400, y: 50, text: '☁️ Internet', props: { size: 'l' } },
      { type: 'rect', x: 350, y: 120, width: 100, height: 60, text: '📶 Modem', color: '#FFF3E0' },
      { type: 'rect', x: 350, y: 220, width: 100, height: 60, text: '📡 Router', color: '#E3F2FD' },
      { type: 'rect', x: 150, y: 350, width: 80, height: 60, text: '💻 PC', color: '#F3E5F5' },
      { type: 'rect', x: 280, y: 350, width: 80, height: 60, text: '💻 Laptop', color: '#EDE7F6' },
      { type: 'rect', x: 410, y: 350, width: 80, height: 60, text: '📺 TV', color: '#263238' },
      { type: 'rect', x: 540, y: 350, width: 80, height: 60, text: '📱 Phone', color: '#E0F2F1' },
    ],
  },
  {
    id: 'home-network-advanced',
    name: 'Advanced Home Network',
    description: 'Network with switch, NAS, access points, and smart devices',
    category: 'network',
    thumbnail: '🖥️',
    shapes: [
      { type: 'text', x: 400, y: 30, text: '☁️ Internet', props: { size: 'l' } },
      { type: 'rect', x: 350, y: 80, width: 100, height: 50, text: '📶 Modem', color: '#FFF3E0' },
      { type: 'rect', x: 350, y: 160, width: 100, height: 50, text: '🛡️ Firewall', color: '#FFCDD2' },
      { type: 'rect', x: 350, y: 240, width: 100, height: 50, text: '📡 Router', color: '#E3F2FD' },
      { type: 'rect', x: 350, y: 320, width: 120, height: 40, text: '🔀 Switch', color: '#E8F5E9' },
      { type: 'rect', x: 100, y: 420, width: 80, height: 80, text: '🖥️ Server', color: '#ECEFF1' },
      { type: 'rect', x: 220, y: 420, width: 80, height: 80, text: '💾 NAS', color: '#E0E0E0' },
      { type: 'rect', x: 340, y: 420, width: 60, height: 60, text: '📻 AP1', color: '#E1F5FE' },
      { type: 'rect', x: 440, y: 420, width: 60, height: 60, text: '📻 AP2', color: '#E1F5FE' },
      { type: 'rect', x: 540, y: 420, width: 80, height: 60, text: '📷 Cameras', color: '#FFEBEE' },
      { type: 'rect', x: 660, y: 420, width: 80, height: 60, text: '🌡️ Smart', color: '#E0F7FA' },
    ],
  },
  {
    id: 'floor-plan-studio',
    name: 'Studio Apartment',
    description: 'Basic studio apartment floor plan',
    category: 'floor-plan',
    thumbnail: '🏠',
    shapes: [
      { type: 'rect', x: 50, y: 50, width: 600, height: 400, text: '', color: '#FAFAFA' },
      { type: 'rect', x: 60, y: 60, width: 200, height: 150, text: '🛏️ Bedroom Area', color: '#E8F5E9' },
      { type: 'rect', x: 280, y: 60, width: 180, height: 150, text: '🛋️ Living Area', color: '#E3F2FD' },
      { type: 'rect', x: 480, y: 60, width: 150, height: 150, text: '🍳 Kitchen', color: '#FFF3E0' },
      { type: 'rect', x: 60, y: 230, width: 150, height: 200, text: '🚿 Bathroom', color: '#E1F5FE' },
      { type: 'rect', x: 230, y: 350, width: 80, height: 80, text: '🚪 Entry', color: '#ECEFF1' },
    ],
  },
  {
    id: 'floor-plan-house',
    name: 'Single Family Home',
    description: 'Typical single family home layout',
    category: 'floor-plan',
    thumbnail: '🏡',
    shapes: [
      { type: 'rect', x: 50, y: 50, width: 700, height: 500, text: '', color: '#FAFAFA' },
      { type: 'rect', x: 60, y: 60, width: 250, height: 200, text: '🛋️ Living Room', color: '#E3F2FD' },
      { type: 'rect', x: 330, y: 60, width: 200, height: 200, text: '🍽️ Dining Room', color: '#FFF8E1' },
      { type: 'rect', x: 550, y: 60, width: 180, height: 200, text: '🍳 Kitchen', color: '#FFF3E0' },
      { type: 'rect', x: 60, y: 280, width: 200, height: 250, text: '🛏️ Master Bedroom', color: '#E8F5E9' },
      { type: 'rect', x: 280, y: 280, width: 150, height: 150, text: '🛏️ Bedroom 2', color: '#F3E5F5' },
      { type: 'rect', x: 450, y: 280, width: 150, height: 150, text: '🛏️ Bedroom 3', color: '#EDE7F6' },
      { type: 'rect', x: 280, y: 450, width: 100, height: 80, text: '🚿 Bath', color: '#E1F5FE' },
      { type: 'rect', x: 400, y: 450, width: 100, height: 80, text: '🚿 Bath', color: '#E1F5FE' },
      { type: 'rect', x: 620, y: 300, width: 100, height: 230, text: '🚗 Garage', color: '#BDBDBD' },
    ],
  },
  {
    id: 'plumbing-basic',
    name: 'Basic Plumbing Layout',
    description: 'Home plumbing with water main and fixtures',
    category: 'plumbing',
    thumbnail: '🚿',
    shapes: [
      { type: 'rect', x: 50, y: 250, width: 60, height: 60, text: '💧 Main', color: '#2196F3' },
      { type: 'rect', x: 180, y: 250, width: 60, height: 80, text: '🔥 Heater', color: '#FFCCBC' },
      { type: 'text', x: 400, y: 50, text: '--- Hot Water (Red) ---', color: '#F44336' },
      { type: 'text', x: 400, y: 80, text: '--- Cold Water (Blue) ---', color: '#2196F3' },
      { type: 'rect', x: 350, y: 150, width: 80, height: 60, text: '🍽️ Kitchen Sink', color: '#ECEFF1' },
      { type: 'rect', x: 500, y: 150, width: 60, height: 60, text: '🍽️ Dishwasher', color: '#B0BEC5' },
      { type: 'rect', x: 350, y: 300, width: 50, height: 70, text: '🚽 Toilet', color: '#ECEFF1' },
      { type: 'rect', x: 420, y: 300, width: 60, height: 50, text: '🚰 Sink', color: '#ECEFF1' },
      { type: 'rect', x: 500, y: 280, width: 90, height: 90, text: '🚿 Shower', color: '#E3F2FD' },
      { type: 'rect', x: 350, y: 430, width: 70, height: 70, text: '🧺 Washer', color: '#CFD8DC' },
    ],
  },
  {
    id: 'electrical-panel',
    name: 'Electrical Circuit Layout',
    description: 'Electrical panel with circuits',
    category: 'electrical',
    thumbnail: '⚡',
    shapes: [
      { type: 'rect', x: 50, y: 150, width: 80, height: 120, text: '⚡ Panel', color: '#455A64' },
      { type: 'text', x: 50, y: 100, text: '200A Main Panel' },
      { type: 'rect', x: 200, y: 100, width: 120, height: 50, text: '🍳 Kitchen 20A', color: '#FFF3E0' },
      { type: 'rect', x: 350, y: 100, width: 120, height: 50, text: '🧺 Laundry 20A', color: '#E3F2FD' },
      { type: 'rect', x: 500, y: 100, width: 120, height: 50, text: '❄️ HVAC 30A', color: '#B3E5FC' },
      { type: 'rect', x: 200, y: 180, width: 120, height: 50, text: '🛋️ Living 15A', color: '#E8F5E9' },
      { type: 'rect', x: 350, y: 180, width: 120, height: 50, text: '🛏️ Bed1 15A', color: '#F3E5F5' },
      { type: 'rect', x: 500, y: 180, width: 120, height: 50, text: '🛏️ Bed2 15A', color: '#EDE7F6' },
      { type: 'rect', x: 200, y: 260, width: 120, height: 50, text: '🚿 Bath 20A', color: '#E1F5FE' },
      { type: 'rect', x: 350, y: 260, width: 120, height: 50, text: '🚗 Garage 20A', color: '#BDBDBD' },
      { type: 'rect', x: 500, y: 260, width: 120, height: 50, text: '🌳 Outdoor 20A', color: '#C8E6C9' },
    ],
  },
  {
    id: 'hvac-layout',
    name: 'HVAC System Layout',
    description: 'Central HVAC with ducts and vents',
    category: 'hvac',
    thumbnail: '❄️',
    shapes: [
      { type: 'rect', x: 350, y: 50, width: 100, height: 100, text: '❄️ HVAC Unit', color: '#B3E5FC' },
      { type: 'rect', x: 350, y: 180, width: 100, height: 60, text: '🔥 Furnace', color: '#FFCCBC' },
      { type: 'rect', x: 150, y: 300, width: 80, height: 25, text: '💨 Vent', color: '#CFD8DC' },
      { type: 'rect', x: 280, y: 300, width: 80, height: 25, text: '💨 Vent', color: '#CFD8DC' },
      { type: 'rect', x: 410, y: 300, width: 80, height: 25, text: '💨 Vent', color: '#CFD8DC' },
      { type: 'rect', x: 540, y: 300, width: 80, height: 25, text: '💨 Vent', color: '#CFD8DC' },
      { type: 'rect', x: 200, y: 400, width: 60, height: 60, text: '🔄 Return', color: '#B0BEC5' },
      { type: 'rect', x: 500, y: 400, width: 60, height: 60, text: '🔄 Return', color: '#B0BEC5' },
      { type: 'rect', x: 350, y: 400, width: 50, height: 50, text: '🌡️', color: '#E1F5FE' },
    ],
  },
  {
    id: 'yard-layout',
    name: 'Yard & Landscape',
    description: 'Outdoor yard layout with landscaping',
    category: 'yard',
    thumbnail: '🌳',
    shapes: [
      { type: 'rect', x: 250, y: 50, width: 300, height: 200, text: '🏠 House', color: '#EFEBE9' },
      { type: 'rect', x: 100, y: 100, width: 120, height: 150, text: '🚗 Garage', color: '#BDBDBD' },
      { type: 'rect', x: 100, y: 280, width: 80, height: 200, text: '🚗 Driveway', color: '#9E9E9E' },
      { type: 'rect', x: 300, y: 280, width: 200, height: 100, text: '🏠 Patio', color: '#D7CCC8' },
      { type: 'rect', x: 550, y: 150, width: 150, height: 80, text: '🏊 Pool', color: '#4FC3F7' },
      { type: 'ellipse', x: 550, y: 50, width: 60, height: 60, text: '🌳', color: '#A5D6A7' },
      { type: 'ellipse', x: 650, y: 50, width: 60, height: 60, text: '🌳', color: '#A5D6A7' },
      { type: 'ellipse', x: 750, y: 50, width: 60, height: 60, text: '🌳', color: '#A5D6A7' },
      { type: 'rect', x: 50, y: 50, width: 20, height: 450, text: '', color: '#8D6E63' }, // Fence
      { type: 'rect', x: 750, y: 50, width: 20, height: 450, text: '', color: '#8D6E63' }, // Fence
    ],
  },
];

// Get shapes by category
export function getShapesByCategory(categoryId: string): DiagramShape[] {
  return DIAGRAM_SHAPES.filter(shape => shape.category === categoryId);
}

// Get templates by category
export function getTemplatesByCategory(categoryId: string): DiagramTemplate[] {
  return DIAGRAM_TEMPLATES.filter(template => template.category === categoryId);
}

// Get all templates
export function getAllTemplates(): DiagramTemplate[] {
  return DIAGRAM_TEMPLATES;
}









