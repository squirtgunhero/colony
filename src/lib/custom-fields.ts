// ============================================================================
// COLONY - Custom Fields Engine
// CRUD operations for custom field definitions and values
// ============================================================================

import { prisma } from "@/lib/prisma";

export type CustomFieldType = "text" | "number" | "date" | "select" | "multiselect" | "boolean" | "url" | "email" | "phone";
export type CustomFieldEntityType = "contact" | "deal" | "company" | "property";

export interface CustomFieldDefinitionInput {
  entityType: CustomFieldEntityType;
  name: string;
  fieldKey: string;
  fieldType: CustomFieldType;
  options?: string[];
  isRequired?: boolean;
  sortOrder?: number;
}

/**
 * Create a new custom field definition.
 */
export async function createCustomField(userId: string, input: CustomFieldDefinitionInput) {
  return prisma.customFieldDefinition.create({
    data: {
      userId,
      entityType: input.entityType,
      name: input.name,
      fieldKey: input.fieldKey,
      fieldType: input.fieldType,
      options: input.options || [],
      isRequired: input.isRequired || false,
      sortOrder: input.sortOrder || 0,
    },
  });
}

/**
 * Get all custom field definitions for a user and entity type.
 */
export async function getCustomFields(userId: string, entityType: CustomFieldEntityType) {
  return prisma.customFieldDefinition.findMany({
    where: { userId, entityType, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * Get custom field values for a specific entity.
 */
export async function getCustomFieldValues(entityId: string) {
  const values = await prisma.customFieldValue.findMany({
    where: { entityId },
    include: { definition: true },
  });

  return values.map((v) => ({
    fieldKey: v.definition.fieldKey,
    name: v.definition.name,
    fieldType: v.definition.fieldType,
    value: v.value,
    options: v.definition.options,
  }));
}

/**
 * Set a custom field value for an entity.
 */
export async function setCustomFieldValue(definitionId: string, entityId: string, value: string) {
  return prisma.customFieldValue.upsert({
    where: { definitionId_entityId: { definitionId, entityId } },
    create: { definitionId, entityId, value },
    update: { value },
  });
}

/**
 * Set multiple custom field values at once.
 */
export async function setCustomFieldValues(
  entityId: string,
  fields: Array<{ definitionId: string; value: string }>
) {
  return prisma.$transaction(
    fields.map((f) =>
      prisma.customFieldValue.upsert({
        where: { definitionId_entityId: { definitionId: f.definitionId, entityId } },
        create: { definitionId: f.definitionId, entityId, value: f.value },
        update: { value: f.value },
      })
    )
  );
}

/**
 * Delete a custom field definition and all its values.
 */
export async function deleteCustomField(userId: string, definitionId: string) {
  return prisma.customFieldDefinition.deleteMany({
    where: { id: definitionId, userId },
  });
}

/**
 * Update a custom field definition.
 */
export async function updateCustomField(
  userId: string,
  definitionId: string,
  updates: Partial<Pick<CustomFieldDefinitionInput, "name" | "options" | "isRequired" | "sortOrder">>
) {
  return prisma.customFieldDefinition.updateMany({
    where: { id: definitionId, userId },
    data: updates,
  });
}
