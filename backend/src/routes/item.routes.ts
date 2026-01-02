/**
 * @fileoverview Item Routes - Inventory Management API
 *
 * This module provides RESTful API endpoints for managing inventory items in HomeTracker.
 * All endpoints follow the standard response format: { success: boolean, data?: any, error?: string }
 *
 * @module routes/item.routes
 * @requires express
 * @requires ../services/excel.service
 *
 * @example
 * // Mount in server.ts:
 * app.use('/api/items', itemRoutes);
 *
 * // API Base URL: /api/items
 *
 * @apiSuccessResponse
 * {
 *   success: true,
 *   data: Item | Item[] | string
 * }
 *
 * @apiErrorResponse
 * {
 *   success: false,
 *   error: string
 * }
 */

import { Router, Request, Response } from 'express';
import { excelService } from '../services/excel.service';

const router = Router();

/**
 * GET /api/items
 *
 * Retrieve all inventory items from the database.
 *
 * @route GET /api/items
 * @group Items - Inventory management operations
 * @access Public (TODO: Add authentication middleware)
 *
 * @returns {Object} 200 - Success response with array of items
 * @returns {InventoryItem[]} 200.data - Array of inventory items
 * @returns {Object} 500 - Internal server error
 *
 * @typedef {Object} InventoryItem
 * @property {string} id - Unique identifier (UUID)
 * @property {string} name - Item name
 * @property {string} category - Item category (e.g., "Kitchen Appliances", "Tools")
 * @property {string} [brand] - Brand name
 * @property {string} [modelNumber] - Model number
 * @property {string} [serialNumber] - Serial number
 * @property {string} location - Physical location in home
 * @property {string} [purchaseDate] - ISO date string
 * @property {number} [purchasePrice] - Purchase price in dollars
 * @property {number} [currentValue] - Current estimated value
 * @property {string} condition - One of: "excellent" | "good" | "fair" | "poor"
 * @property {string} [notes] - Additional notes
 * @property {string[]} photos - Array of image URLs
 * @property {string[]} tags - Searchable tags
 * @property {Object} [warranty] - Warranty information
 * @property {string} status - One of: "active" | "sold" | "deleted"
 * @property {Object} [sale] - Sale record if status is "sold"
 * @property {Object} [consumableInfo] - Consumable/replacement tracking info
 * @property {string} [deletedAt] - ISO date when soft-deleted
 *
 * @example
 * // Request
 * GET /api/items
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "550e8400-e29b-41d4-a716-446655440000",
 *       "name": "Samsung Refrigerator",
 *       "category": "Kitchen Appliances",
 *       "brand": "Samsung",
 *       "modelNumber": "RF28R7351SR",
 *       "location": "Kitchen",
 *       "purchaseDate": "2023-05-15",
 *       "purchasePrice": 2499,
 *       "currentValue": 2000,
 *       "condition": "excellent",
 *       "photos": ["/uploads/fridge-front.jpg"],
 *       "tags": ["appliance", "kitchen"],
 *       "status": "active"
 *     }
 *   ]
 * }
 *
 * // Response 500
 * {
 *   "success": false,
 *   "error": "Failed to get items"
 * }
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const items = excelService.getItems();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get items' });
  }
});

/**
 * GET /api/items/:id
 *
 * Retrieve a single inventory item by its unique identifier.
 *
 * @route GET /api/items/:id
 * @group Items - Inventory management operations
 * @access Public (TODO: Add authentication middleware)
 *
 * @param {string} id.path.required - Item ID (UUID format)
 *
 * @returns {Object} 200 - Success response with single item
 * @returns {InventoryItem} 200.data - The requested inventory item
 * @returns {Object} 404 - Item not found
 * @returns {Object} 500 - Internal server error
 *
 * @example
 * // Request
 * GET /api/items/550e8400-e29b-41d4-a716-446655440000
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000",
 *     "name": "Samsung Refrigerator",
 *     "category": "Kitchen Appliances",
 *     "brand": "Samsung",
 *     "modelNumber": "RF28R7351SR",
 *     "serialNumber": "ABC123456",
 *     "location": "Kitchen",
 *     "purchaseDate": "2023-05-15",
 *     "purchasePrice": 2499,
 *     "currentValue": 2000,
 *     "condition": "excellent",
 *     "notes": "French door model with ice maker",
 *     "photos": ["/uploads/fridge-front.jpg"],
 *     "tags": ["appliance", "kitchen"],
 *     "status": "active",
 *     "warranty": {
 *       "provider": "Samsung",
 *       "endDate": "2028-05-15",
 *       "coverageDetails": "5-year manufacturer warranty"
 *     }
 *   }
 * }
 *
 * // Response 404
 * {
 *   "success": false,
 *   "error": "Item not found"
 * }
 *
 * // Response 500
 * {
 *   "success": false,
 *   "error": "Failed to get item"
 * }
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const item = excelService.getItem(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get item' });
  }
});

/**
 * POST /api/items
 *
 * Create a new inventory item.
 *
 * @route POST /api/items
 * @group Items - Inventory management operations
 * @access Public (TODO: Add authentication middleware)
 *
 * @param {Object} body.body.required - Item data
 * @param {string} body.name.required - Item name (1-255 characters)
 * @param {string} body.category.required - Item category
 * @param {string} body.location.required - Physical location in home
 * @param {string} body.condition.required - Condition: "excellent" | "good" | "fair" | "poor"
 * @param {string} [body.brand] - Brand name
 * @param {string} [body.modelNumber] - Model number
 * @param {string} [body.serialNumber] - Serial number
 * @param {string} [body.purchaseDate] - ISO date string (YYYY-MM-DD)
 * @param {number} [body.purchasePrice] - Purchase price in dollars (positive number)
 * @param {number} [body.currentValue] - Current estimated value in dollars
 * @param {string} [body.notes] - Additional notes (max 10,000 characters)
 * @param {string[]} [body.photos] - Array of image URLs/paths
 * @param {string[]} [body.tags] - Searchable tags
 * @param {Object} [body.warranty] - Warranty information object
 * @param {Object} [body.consumableInfo] - Consumable/replacement tracking info
 *
 * @returns {Object} 201 - Success response with created item (includes auto-generated id)
 * @returns {InventoryItem} 201.data - The newly created item with id
 * @returns {Object} 500 - Internal server error (validation failures, database errors)
 *
 * @example
 * // Request
 * POST /api/items
 * Content-Type: application/json
 *
 * {
 *   "name": "Samsung Refrigerator",
 *   "category": "Kitchen Appliances",
 *   "brand": "Samsung",
 *   "modelNumber": "RF28R7351SR",
 *   "serialNumber": "ABC123456",
 *   "location": "Kitchen",
 *   "purchaseDate": "2023-05-15",
 *   "purchasePrice": 2499,
 *   "currentValue": 2000,
 *   "condition": "excellent",
 *   "notes": "French door model with ice maker",
 *   "photos": [],
 *   "tags": ["appliance", "kitchen"],
 *   "warranty": {
 *     "provider": "Samsung",
 *     "endDate": "2028-05-15",
 *     "coverageDetails": "5-year manufacturer warranty"
 *   }
 * }
 *
 * // Response 201
 * {
 *   "success": true,
 *   "data": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000",
 *     "name": "Samsung Refrigerator",
 *     "category": "Kitchen Appliances",
 *     "brand": "Samsung",
 *     "modelNumber": "RF28R7351SR",
 *     "serialNumber": "ABC123456",
 *     "location": "Kitchen",
 *     "purchaseDate": "2023-05-15",
 *     "purchasePrice": 2499,
 *     "currentValue": 2000,
 *     "condition": "excellent",
 *     "notes": "French door model with ice maker",
 *     "photos": [],
 *     "tags": ["appliance", "kitchen"],
 *     "status": "active",
 *     "warranty": {
 *       "provider": "Samsung",
 *       "endDate": "2028-05-15",
 *       "coverageDetails": "5-year manufacturer warranty"
 *     }
 *   }
 * }
 *
 * // Response 500 (validation error)
 * {
 *   "success": false,
 *   "error": "Failed to create item"
 * }
 *
 * @notes
 * - The `id` field is auto-generated (UUID v4) - do not include in request body
 * - The `status` field defaults to "active" if not provided
 * - Empty arrays are valid for `photos` and `tags`
 * - All optional fields can be omitted or set to null/undefined
 * - Date strings must be in ISO 8601 format (YYYY-MM-DD)
 * - Price/value fields should be positive numbers (validation may be enforced)
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const item = excelService.createItem(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create item' });
  }
});

/**
 * PUT /api/items/:id
 *
 * Update an existing inventory item. This endpoint performs a partial update - only
 * fields present in the request body will be updated. Omitted fields retain their
 * current values.
 *
 * @route PUT /api/items/:id
 * @group Items - Inventory management operations
 * @access Public (TODO: Add authentication middleware)
 *
 * @param {string} id.path.required - Item ID (UUID format)
 * @param {Object} body.body.required - Fields to update (partial item data)
 * @param {string} [body.name] - Item name (1-255 characters)
 * @param {string} [body.category] - Item category
 * @param {string} [body.location] - Physical location in home
 * @param {string} [body.condition] - Condition: "excellent" | "good" | "fair" | "poor"
 * @param {string} [body.brand] - Brand name
 * @param {string} [body.modelNumber] - Model number
 * @param {string} [body.serialNumber] - Serial number
 * @param {string} [body.purchaseDate] - ISO date string (YYYY-MM-DD)
 * @param {number} [body.purchasePrice] - Purchase price in dollars
 * @param {number} [body.currentValue] - Current estimated value in dollars
 * @param {string} [body.notes] - Additional notes
 * @param {string[]} [body.photos] - Array of image URLs/paths (replaces entire array)
 * @param {string[]} [body.tags] - Searchable tags (replaces entire array)
 * @param {string} [body.status] - Status: "active" | "sold" | "deleted"
 * @param {Object} [body.warranty] - Warranty information (replaces entire object)
 * @param {Object} [body.sale] - Sale record (replaces entire object)
 * @param {Object} [body.consumableInfo] - Consumable info (replaces entire object)
 *
 * @returns {Object} 200 - Success response with updated item
 * @returns {InventoryItem} 200.data - The updated item with all fields
 * @returns {Object} 404 - Item not found
 * @returns {Object} 500 - Internal server error (validation failures, database errors)
 *
 * @example
 * // Request - Update only currentValue and condition
 * PUT /api/items/550e8400-e29b-41d4-a716-446655440000
 * Content-Type: application/json
 *
 * {
 *   "currentValue": 1800,
 *   "condition": "good",
 *   "notes": "Minor scratches on door"
 * }
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": {
 *     "id": "550e8400-e29b-41d4-a716-446655440000",
 *     "name": "Samsung Refrigerator",
 *     "category": "Kitchen Appliances",
 *     "brand": "Samsung",
 *     "modelNumber": "RF28R7351SR",
 *     "location": "Kitchen",
 *     "purchaseDate": "2023-05-15",
 *     "purchasePrice": 2499,
 *     "currentValue": 1800,
 *     "condition": "good",
 *     "notes": "Minor scratches on door",
 *     "photos": ["/uploads/fridge-front.jpg"],
 *     "tags": ["appliance", "kitchen"],
 *     "status": "active"
 *   }
 * }
 *
 * // Response 404
 * {
 *   "success": false,
 *   "error": "Item not found"
 * }
 *
 * // Response 500
 * {
 *   "success": false,
 *   "error": "Failed to update item"
 * }
 *
 * @notes
 * - This is a partial update (PATCH-like behavior) - only send fields you want to change
 * - The `id` field cannot be changed
 * - Arrays (`photos`, `tags`) are replaced entirely, not merged
 * - Nested objects (`warranty`, `sale`, `consumableInfo`) are replaced entirely
 * - To remove an optional field, explicitly set it to null or empty string
 * - Date strings must be in ISO 8601 format (YYYY-MM-DD)
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const item = excelService.updateItem(req.params.id, req.body);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update item' });
  }
});

/**
 * DELETE /api/items/:id
 *
 * Delete an inventory item. This may perform either a soft delete (setting status to
 * 'deleted' and populating deletedAt timestamp) or a hard delete (permanent removal
 * from database), depending on the service implementation.
 *
 * @route DELETE /api/items/:id
 * @group Items - Inventory management operations
 * @access Public (TODO: Add authentication middleware)
 *
 * @param {string} id.path.required - Item ID (UUID format)
 *
 * @returns {Object} 200 - Success response confirming deletion
 * @returns {string} 200.message - Confirmation message
 * @returns {Object} 404 - Item not found
 * @returns {Object} 500 - Internal server error (database errors, constraint violations)
 *
 * @example
 * // Request
 * DELETE /api/items/550e8400-e29b-41d4-a716-446655440000
 *
 * // Response 200
 * {
 *   "success": true,
 *   "message": "Item deleted"
 * }
 *
 * // Response 404
 * {
 *   "success": false,
 *   "error": "Item not found"
 * }
 *
 * // Response 500
 * {
 *   "success": false,
 *   "error": "Failed to delete item"
 * }
 *
 * @notes
 * - This operation may be reversible depending on implementation (soft vs hard delete)
 * - Soft delete sets status='deleted' and populates deletedAt timestamp
 * - Hard delete permanently removes the record from the database
 * - Related records (images, warranty documents) may be cascade deleted
 * - Consider backing up important items before deletion
 * - Deleted items may still appear in some queries (e.g., for audit trails)
 *
 * @see InventoryItem.status - Check if soft delete is implemented
 * @see InventoryItem.deletedAt - Timestamp field for soft deletes
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = excelService.deleteItem(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete item' });
  }
});

export default router;
