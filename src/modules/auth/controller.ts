import { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./service";
import { signupSchema, loginSchema } from "./schema";
import env from "@/config/env";

export class AuthController {
  private service = new AuthService();

  signup = async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = signupSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid signup data",
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const user = await this.service.signup(parseResult.data);
      const token = request.server.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: "1d" }
      );

      reply.setCookie("token", token, {
        path: "/",
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 1 day
      });

      return reply.status(201).send({
        success: true,
        data: { user },
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: {
          code: error.statusCode === 400 ? "USER_EXISTS" : "SERVER_ERROR",
          message: error.message || "Internal server error",
        },
      });
    }
  };

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid login data",
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const user = await this.service.login(parseResult.data);
      const token = request.server.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: "1d" }
      );

      reply.setCookie("token", token, {
        path: "/",
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 1 day
      });

      return reply.send({
        success: true,
        data: { user },
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: {
          code: error.statusCode === 401 ? "INVALID_CREDENTIALS" : "SERVER_ERROR",
          message: error.message || "Internal server error",
        },
      });
    }
  };

  logout = async (request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie("token", {
      path: "/",
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return reply.send({
      success: true,
      data: { message: "Logged out successfully" },
    });
  };

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    const userPayload = request.user as { id: string; email: string } | undefined;
    if (!userPayload) {
      return reply.status(401).send({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        },
      });
    }

    try {
      const user = await this.service.getProfile(userPayload.id);
      return reply.send({
        success: true,
        data: { user },
      });
    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: error.message || "User not found",
        },
      });
    }
  };
}
