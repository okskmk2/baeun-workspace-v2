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
          img_url: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Workspace: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          img_url: { type: "string", nullable: true },
          is_default: { type: "boolean" },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          workspace_id: { type: "integer" },
          img_url: { type: "string", nullable: true },
          is_default: { type: "boolean" },
          theme_json: { type: "object", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Board: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          summary: { type: "string", nullable: true },
          project_id: { type: "integer" },
          type: { type: "string" },
          is_active: { type: "integer" },
          sort_order: { type: "integer" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Issue: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          content: { type: "string", nullable: true },
          board_id: { type: "integer" },
          status: { type: "string" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      WorkspaceMember: {
        type: "object",
        properties: {
          id: { type: "integer" },
          member_id: { type: "integer" },
          workspace_id: { type: "integer" },
          role_name: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
        },
      },
      ProjectMember: {
        type: "object",
        properties: {
          id: { type: "integer" },
          member_id: { type: "integer" },
          project_id: { type: "integer" },
          role_name: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
        },
      },
      Page: {
        type: "object",
        properties: {
          id: { type: "integer" },
          project_id: { type: "integer" },
          parent_id: { type: "integer", nullable: true },
          title: { type: "string" },
          content: { type: "string", nullable: true },
          sort_order: { type: "integer" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
          children: {
            type: "array",
            items: { $ref: "#/components/schemas/Page" },
          },
        },
      },
      PageMember: {
        type: "object",
        properties: {
          id: { type: "integer" },
          member_id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string" },
          role_name: { type: "string" },
        },
      },
      IssueMember: {
        type: "object",
        properties: {
          issue_member_id: { type: "integer" },
          member_id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string" },
          role_name: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Channel: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          project_id: { type: "integer" },
          type: { type: "string", nullable: true },
          sort_order: { type: "integer" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      ChatMessage: {
        type: "object",
        properties: {
          id: { type: "integer" },
          content: { type: "string" },
          created_at: { type: "string", format: "date-time" },
          created_by: { type: "integer" },
          creator_name: { type: "string" },
          creator_img: { type: "string", nullable: true },
          channel_id: { type: "integer" },
          type: { type: "string", enum: ["SYSTEM", "USER", "AGENT"] },
        },
      },
      ChannelMember: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string" },
          img_url: { type: "string", nullable: true },
          role_name: { type: "string" },
        },
      },
      IssueWithAssignees: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          content: { type: "string", nullable: true },
          board_id: { type: "integer" },
          status: { type: "string" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
          assignee_members: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
                role_name: { type: "string" },
              },
            },
          },
        },
      },
      ChatRecentMessage: {
        type: "object",
        properties: {
          message_id: { type: "integer" },
          content: { type: "string" },
          created_at: { type: "string", format: "date-time" },
          created_by: { type: "integer" },
          creator_name: { type: "string" },
          channel_id: { type: "integer" },
          channel_name: { type: "string" },
          type: { type: "string", enum: ["SYSTEM", "USER", "AGENT"] },
        },
      },
      CreatedId: {
        type: "object",
        properties: {
          id: { type: "integer" },
        },
      },
      SignupCreatedIds: {
        type: "object",
        properties: {
          user_id: { type: "integer" },
          workspace_id: { type: "integer" },
          project_id: { type: "integer" },
        },
      },
      ChatInviteCreatedIds: {
        type: "object",
        properties: {
          channel_member_id: { type: "integer" },
          message_id: { type: "integer" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          name: { type: "string" },
          message: { type: "string" },
          details: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      SimpleSuccessResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
    },
    responses: {
      Success200Message: {
        description: "요청 성공",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SimpleSuccessResponse" },
          },
        },
      },
      Success201Message: {
        description: "생성 성공",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/SimpleSuccessResponse" },
          },
        },
      },
      ErrorResponse: {
        description: "요청 실패",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
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
