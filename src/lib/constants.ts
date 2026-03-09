export const ITEM_TYPES = [
  { value: "RAW_MATERIAL" as const, label: "Raw Material" },
  { value: "SEMI_FINISHED" as const, label: "Semi-Finished" },
  { value: "FINISHED" as const, label: "Finished" },
  { value: "PACKAGING" as const, label: "Packaging" },
];

export const APP_ROLES = [
  { value: "admin" as const, label: "Admin" },
  { value: "staff" as const, label: "Staff" },
  { value: "viewer" as const, label: "Viewer" },
];

/**
 * SKU Format Guide
 *
 * Format: {TYPE}-{CATEGORY}-{SEQ}
 *
 * Type Prefixes:
 *   RM = Raw Material
 *   SF = Semi-Finished
 *   FN = Finished
 *   PK = Packaging
 *
 * Category Codes (examples):
 *   DC = Dairy & Cream
 *   FL = Flavoring
 *   SW = Sweetener
 *   FR = Fruit
 *   CP = Cups & Containers
 *   TP = Toppings
 *
 * Sequence: 3-digit zero-padded number (001-999)
 *
 * Examples:
 *   RM-DC-001 = Raw Material, Dairy & Cream, #001 (e.g., Fresh Milk)
 *   SF-FL-003 = Semi-Finished, Flavoring, #003 (e.g., Matcha Syrup)
 *   FN-TP-012 = Finished, Toppings, #012 (e.g., Oreo Cheesecake)
 *   PK-CP-001 = Packaging, Cups, #001 (e.g., 16oz Cup)
 */
export const SKU_FORMAT_GUIDE = `Format: {TYPE}-{CATEGORY}-{SEQ}

Type Prefixes:
  RM = Raw Material
  SF = Semi-Finished
  FN = Finished
  PK = Packaging

Category Codes (examples):
  DC = Dairy & Cream
  FL = Flavoring
  SW = Sweetener
  FR = Fruit
  CP = Cups & Containers
  TP = Toppings

Sequence: 3-digit zero-padded number (001-999)

Examples:
  RM-DC-001 (Fresh Milk)
  SF-FL-003 (Matcha Syrup)
  FN-TP-012 (Oreo Cheesecake)
  PK-CP-001 (16oz Cup)`;
