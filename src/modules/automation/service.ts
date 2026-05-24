import { AutomationRepository } from "./repository";
import { CreateAutomationInput, UpdateAutomationInput } from "./schema";

const repository = new AutomationRepository();

export class AutomationService {
  async list(userId: string) {
    return repository.findByUserId(userId);
  }

  async create(userId: string, data: CreateAutomationInput) {
    // Check for duplicate keyword
    const existing = await repository.findByKeyword(userId, data.keyword);
    if (existing) {
      const error: any = new Error(`Keyword "${data.keyword}" already exists`);
      error.statusCode = 400;
      throw error;
    }

    const rule = await repository.create({
      user_id: userId,
      keyword: data.keyword,
      reply: data.reply,
    });

    return rule;
  }

  async update(userId: string, ruleId: string, data: UpdateAutomationInput) {
    // Verify ownership
    const rule = await repository.findById(ruleId);
    if (!rule || rule.user_id !== userId) {
      const error: any = new Error("Automation rule not found");
      error.statusCode = 404;
      throw error;
    }

    // If updating keyword, check for duplicates
    if (data.keyword && data.keyword !== rule.keyword) {
      const existing = await repository.findByKeyword(userId, data.keyword);
      if (existing) {
        const error: any = new Error(`Keyword "${data.keyword}" already exists`);
        error.statusCode = 400;
        throw error;
      }
    }

    return repository.update(ruleId, data);
  }

  async delete(userId: string, ruleId: string) {
    // Verify ownership
    const rule = await repository.findById(ruleId);
    if (!rule || rule.user_id !== userId) {
      const error: any = new Error("Automation rule not found");
      error.statusCode = 404;
      throw error;
    }

    return repository.delete(ruleId);
  }

  async toggle(userId: string, ruleId: string) {
    const rule = await repository.findById(ruleId);
    if (!rule || rule.user_id !== userId) {
      const error: any = new Error("Automation rule not found");
      error.statusCode = 404;
      throw error;
    }

    return repository.update(ruleId, { is_active: !rule.is_active });
  }
}
