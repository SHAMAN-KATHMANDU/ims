import swaggerJsdoc from "swagger-jsdoc";
import { SwaggerDefinition } from "swagger-jsdoc";

const swaggerDefinition: SwaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "IMS API Documentation",
    version: "1.0.0",
    description: "API documentation for Inventory Management System",
    contact: {
      name: "API Support",
    },
  },
  servers: [
    {
      url: "http://localhost:4000/api/v1",
      description: "Development server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter JWT token obtained from /auth/login endpoint",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Error message",
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          username: {
            type: "string",
          },
          role: {
            type: "string",
            enum: ["superAdmin", "admin", "user"],
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      Category: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          name: {
            type: "string",
          },
          description: {
            type: "string",
            nullable: true,
          },
          createdAt: {
            type: "string",
            format: "date-time",
          },
          updatedAt: {
            type: "string",
            format: "date-time",
          },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: {
            type: "string",
            format: "uuid",
          },
          imsCode: {
            type: "string",
          },
          name: {
            type: "string",
          },
          categoryId: {
            type: "string",
            format: "uuid",
          },
          description: {
            type: "string",
            nullable: true,
          },
          length: {
            type: "number",
            nullable: true,
          },
          breadth: {
            type: "number",
            nullable: true,
          },
          height: {
            type: "number",
            nullable: true,
          },
          weight: {
            type: "number",
            nullable: true,
          },
          costPrice: {
            type: "number",
          },
          mrp: {
            type: "number",
          },
          createdById: {
            type: "string",
            format: "uuid",
          },
          dateCreated: {
            type: "string",
            format: "date-time",
          },
          dateModified: {
            type: "string",
            format: "date-time",
          },
        },
      },
    },
  },
  tags: [
    {
      name: "Authentication",
      description: "Authentication endpoints",
    },
    {
      name: "Users",
      description: "User management endpoints (superAdmin only)",
    },
    {
      name: "Categories",
      description: "Category management endpoints",
    },
    {
      name: "Products",
      description: "Product management endpoints",
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: ["./src/modules/**/*.router.ts", "./src/modules/**/*.controller.ts"], // Paths to files containing OpenAPI definitions
};

export const swaggerSpec = swaggerJsdoc(options);
