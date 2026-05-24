import { FastifyReply, FastifyRequest } from "fastify";
import { DashboardService } from "./service";

export class DashboardController {
  private service = new DashboardService();

  /**
   * GET /api/dashboard
   */
  getDashboard = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string } | undefined;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
    }

    try {
      const data = await this.service.getDashboard(user.id);
      return reply.send({
        success: true,
        data,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error.message || "Failed to fetch dashboard data",
        },
      });
    }
  };
}
