import { WhatsappRepository } from "@/modules/whatsapp/repository";
import { AutomationRepository } from "@/modules/automation/repository";
import { MessageLogRepository } from "@/modules/message/repository";
import { ActivityLogRepository } from "@/modules/activity/repository";
import whatsappManager from "@/modules/whatsapp/manager";

const whatsappRepo = new WhatsappRepository();
const automationRepo = new AutomationRepository();
const messageRepo = new MessageLogRepository();
const activityRepo = new ActivityLogRepository();

// Average time per manual reply in minutes (for time-saved calculation)
const AVG_MANUAL_REPLY_MINUTES = 1.5;

export class DashboardService {
  async getDashboard(userId: string) {
    // Fetch all data in parallel
    const [session, activeRulesCount, automations, autoRepliesToday, incomingToday, activities] =
      await Promise.all([
        whatsappRepo.getSession(userId),
        automationRepo.countActiveByUserId(userId),
        automationRepo.findByUserId(userId),
        messageRepo.countTodayAutomated(userId),
        messageRepo.countTodayIncoming(userId),
        activityRepo.getRecent(userId, 10),
      ]);

    // Calculate time saved
    const timeSavedMinutes = autoRepliesToday * AVG_MANUAL_REPLY_MINUTES;
    const timeSavedFormatted =
      timeSavedMinutes >= 60
        ? `${(timeSavedMinutes / 60).toFixed(1)}h`
        : `${Math.round(timeSavedMinutes)}m`;

    // Get live status from manager (more accurate than DB)
    const liveStatus = whatsappManager.getClientStatus(userId);

    return {
      connection: {
        phone: session?.phone || null,
        status: liveStatus !== "idle" ? liveStatus : session?.status || "disconnected",
      },
      stats: {
        activeAutomations: activeRulesCount,
        autoRepliesToday,
        incomingToday,
        timeSavedToday: timeSavedFormatted,
      },
      automations,
      activities: activities.map((a: any) => ({
        id: a.id,
        event_type: a.event_type,
        metadata: a.metadata,
        created_at: a.created_at,
      })),
    };
  }
}
