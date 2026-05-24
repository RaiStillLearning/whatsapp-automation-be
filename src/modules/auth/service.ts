import bcrypt from "bcryptjs";
import { AuthRepository } from "./repository";
import { SignupInput, LoginInput } from "./schema";
import { UserResponse } from "./types";

export class AuthService {
  private repository = new AuthRepository();

  async signup(data: SignupInput): Promise<UserResponse> {
    const existingUser = await this.repository.findByEmail(data.email);
    if (existingUser) {
      const error = new Error("User with this email already exists");
      (error as any).statusCode = 400;
      throw error;
    }

    const password_hash = await bcrypt.hash(data.password, 10);
    const user = await this.repository.createUser({
      ...data,
      password_hash,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async login(data: LoginInput): Promise<UserResponse> {
    const user = await this.repository.findByEmail(data.email);
    if (!user) {
      const error = new Error("Invalid email or password");
      (error as any).statusCode = 401;
      throw error;
    }

    const isValid = await bcrypt.compare(data.password, user.password_hash);
    if (!isValid) {
      const error = new Error("Invalid email or password");
      (error as any).statusCode = 401;
      throw error;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.repository.findById(userId);
    if (!user) {
      const error = new Error("User not found");
      (error as any).statusCode = 404;
      throw error;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}
