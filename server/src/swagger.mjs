import swaggerJsdoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Baeun Workspace API",
    version: "1.0.0",
    description: "API documentation for Baeun Workspace",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local server",
    },
  ],
  components: {
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          email: { type: "string" },
          name: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Workspace: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          description: { type: "string" },
          ownerId: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          description: { type: "string" },
          workspaceId: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Board: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          projectId: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Issue: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" },
          boardId: { type: "integer" },
          status: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
};

const swaggerOptions = {
  definition: swaggerDefinition,
  apis: ["./src/routes/*.mjs"],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
