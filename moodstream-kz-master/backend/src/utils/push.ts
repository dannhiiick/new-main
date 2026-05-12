import { prisma } from "../db/client.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
}

async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  try {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // non-fatal — push delivery is best-effort
  }
}

export async function notifyArtistFollowers(
  artistId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  // Find all users following this artist who have a push token
  const devices = await prisma.userDevice.findMany({
    where: {
      expoPushToken: { not: null },
      user: {
        artistFollows: { some: { artistId } },
        isBanned: false,
      },
    },
    select: { expoPushToken: true },
  });

  const tokens = devices
    .map((d) => d.expoPushToken)
    .filter((t): t is string => t !== null && t.startsWith("ExponentPushToken"));

  if (tokens.length === 0) return;

  // Expo allows up to 100 per batch
  const BATCH = 100;
  for (let i = 0; i < tokens.length; i += BATCH) {
    const batch = tokens.slice(i, i + BATCH).map((to) => ({
      to,
      title,
      body,
      sound: "default" as const,
      ...(data ? { data } : {}),
    }));
    await sendExpoPush(batch);
  }
}
