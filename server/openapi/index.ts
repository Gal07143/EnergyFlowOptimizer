import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Express } from 'express';

// Get current directory for ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configure OpenAPI documentation middleware
 * @param app Express application
 */
export function setupOpenAPI(app: Express): void {
  try {
    // Load OpenAPI definition from YAML file
    const openApiPath = path.join(__dirname, 'openapi.yaml');
    const openApiSpec = YAML.load(openApiPath);

    // Setup Swagger UI
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none'
      }
    }));

    console.log('OpenAPI documentation available at /api-docs');
  } catch (error) {
    console.error('Failed to setup OpenAPI documentation:', error);
  }
}