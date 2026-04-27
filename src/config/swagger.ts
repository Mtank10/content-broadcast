import swaggerJsdoc from 'swagger-jsdoc';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Content Broadcasting API',
      version: '1.0.0',
      description: 'API for broadcasting content from teachers to students',
    },
    servers: [
      {
        url: BASE_URL,
        description:
          process.env.NODE_ENV === 'production'
            ? 'Production server'
            : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export default swaggerJsdoc(options);