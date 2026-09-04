import { z, ZodTypeAny } from 'zod';

export function jsonSchemaToZod(schema: any): ZodTypeAny {
    if (!schema || typeof schema !== 'object') {
        return z.any();
    }

    switch (schema.type) {
        case 'string':
            return schema.description ? z.string().describe(schema.description) : z.string();
        case 'number':
        case 'integer':
            return schema.description ? z.number().describe(schema.description) : z.number();
        case 'boolean':
            return schema.description ? z.boolean().describe(schema.description) : z.boolean();
        case 'array':
            return z.array(schema.items ? jsonSchemaToZod(schema.items) : z.any());
        case 'object': {
            if (!schema.properties) return z.record(z.string(), z.any());
            const shape: Record<string, ZodTypeAny> = {};
            for (const key of Object.keys(schema.properties)) {
                shape[key] = jsonSchemaToZod(schema.properties[key]);
            }
            return z.object(shape);
        }
        default:
            return z.any();
    }
}

export function buildZodShape(inputSchema: any): Record<string, ZodTypeAny> {
    if (!inputSchema?.properties) return {};

    const required: string[] = inputSchema.required ?? [];
    const shape: Record<string, ZodTypeAny> = {};

    for (const key of Object.keys(inputSchema.properties)) {
        const fieldSchema = jsonSchemaToZod(inputSchema.properties[key]);
        shape[key] = required.includes(key) ? fieldSchema : fieldSchema.optional();
    }

    return shape;
}