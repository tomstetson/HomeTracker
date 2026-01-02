/**
 * Schema Exports
 * 
 * Central export point for all validation schemas
 */

// Item schemas
export {
  createItemSchema,
  updateItemSchema,
  itemIdParamSchema,
  itemQuerySchema,
  type CreateItemInput,
  type UpdateItemInput,
} from './item.schema';

// Project schemas
export {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from './project.schema';

// Warranty schemas
export {
  createWarrantySchema,
  updateWarrantySchema,
  warrantyIdParamSchema,
  type CreateWarrantyInput,
  type UpdateWarrantyInput,
} from './warranty.schema';

// Maintenance schemas
export {
  createMaintenanceSchema,
  updateMaintenanceSchema,
  maintenanceIdParamSchema,
  type CreateMaintenanceInput,
  type UpdateMaintenanceInput,
} from './maintenance.schema';

// Vendor schemas
export {
  createVendorSchema,
  updateVendorSchema,
  vendorIdParamSchema,
  type CreateVendorInput,
  type UpdateVendorInput,
} from './vendor.schema';

// Auth schemas
export {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  refreshTokenSchema,
  type LoginInput,
  type RegisterInput,
  type ChangePasswordInput,
} from './auth.schema';

// AI Job schemas
export {
  aiJobTypeSchema,
  createAIJobSchema,
  aiJobIdParamSchema,
  aiJobQuerySchema,
  type CreateAIJobInput,
  type AIJobType,
} from './ai-job.schema';
