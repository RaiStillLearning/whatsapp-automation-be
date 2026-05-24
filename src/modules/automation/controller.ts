import { FastifyReply, FastifyRequest } from "fastify";
import { AutomationService } from "./service";
import { createAutomationSchema, updateAutomationSchema } from "./schema";

export class AutomationController {
  private service = new AutomationService();

  /**
   * GET /api/automations
   */
  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string } | undefined;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
    }

    const rules = await this.service.list(user.id);
    return reply.send({
      success: true,
      data: { automations: rules },
    });
  };

  /**
   * POST /api/automations
   */
  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string } | undefined;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
    }

    const parseResult = createAutomationSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid automation data",
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const rule = await this.service.create(user.id, parseResult.data);
      return reply.status(201).send({
        success: true,
        data: { automation: rule },
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: {
          code: error.statusCode === 400 ? "DUPLICATE_KEYWORD" : "SERVER_ERROR",
          message: error.message || "Internal server error",
        },
      });
    }
  };

  /**
   * PUT /api/automations/:id
   */
  update = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const user = request.user as { id: string } | undefined;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
    }

    const parseResult = updateAutomationSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid automation data",
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const { id } = request.params as { id: string };
    try {
      const rule = await this.service.update(user.id, id, parseResult.data);
      return reply.send({
        success: true,
        data: { automation: rule },
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: {
          code: error.statusCode === 404 ? "NOT_FOUND" : "SERVER_ERROR",
          message: error.message || "Internal server error",
        },
      });
    }
  };

  /**
   * DELETE /api/automations/:id
   */
  delete = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const user = request.user as { id: string } | undefined;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
    }

    const { id } = request.params as { id: string };
    try {
      await this.service.delete(user.id, id);
      return reply.send({
        success: true,
        data: { message: "Automation rule deleted" },
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: {
          code: error.statusCode === 404 ? "NOT_FOUND" : "SERVER_ERROR",
          message: error.message || "Internal server error",
        },
      });
    }
  };

  /**
   * PATCH /api/automations/:id/toggle
   */
  toggle = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const user = request.user as { id: string } | undefined;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
    }

    const { id } = request.params as { id: string };
    try {
      const rule = await this.service.toggle(user.id, id);
      return reply.send({
        success: true,
        data: { automation: rule },
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: {
          code: error.statusCode === 404 ? "NOT_FOUND" : "SERVER_ERROR",
          message: error.message || "Internal server error",
        },
      });
    }
  };
}
