import { db, socialConnectionsTable, type SocialConnection } from "@workspace/db";
import { eq } from "drizzle-orm";
import { decryptSocialSecret, encryptSocialSecret } from "./socialSecurity";
import { SocialProviderError } from "./socialProviders";

export async function refreshXConnection(connection: SocialConnection) {
  if (connection.platform !== "x" || !connection.tokenExpiresAt ||
      connection.tokenExpiresAt.getTime() > Date.now() + 90_000) return connection;
  if (!connection.refreshTokenEncrypted) {
    await db.update(socialConnectionsTable).set({ status: "needs_reauth", updatedAt: new Date() })
      .where(eq(socialConnectionsTable.id, connection.id));
    throw new SocialProviderError("X: انتهت صلاحية الاتصال؛ أعد ربط الحساب من لوحة الإدارة.", 401);
  }

  const clientId = process.env["X_CLIENT_ID"] || "";
  const clientSecret = process.env["X_CLIENT_SECRET"] || "";
  const form = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: decryptSocialSecret(connection.refreshTokenEncrypted),
    client_id: clientId,
  });
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
  }
  let response: Response;
  try {
    response = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST", headers, body: form, signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new SocialProviderError("X: تعذر تجديد صلاحية الاتصال.", undefined, true);
  }
  const data = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok || typeof data.access_token !== "string") {
    await db.update(socialConnectionsTable).set({ status: "needs_reauth", updatedAt: new Date() })
      .where(eq(socialConnectionsTable.id, connection.id));
    throw new SocialProviderError("X: لم يعد التفويض صالحاً؛ أعد ربط الحساب من لوحة الإدارة.", response.status);
  }
  const now = Date.now();
  const expiresAt = Number.isFinite(Number(data.expires_in))
    ? new Date(now + Number(data.expires_in) * 1000)
    : null;
  const updatedValues = {
    accessTokenEncrypted: encryptSocialSecret(data.access_token),
    refreshTokenEncrypted: typeof data.refresh_token === "string"
      ? encryptSocialSecret(data.refresh_token)
      : connection.refreshTokenEncrypted,
    tokenExpiresAt: expiresAt,
    status: "active",
    updatedAt: new Date(),
  };
  const [updated] = await db.update(socialConnectionsTable).set(updatedValues)
    .where(eq(socialConnectionsTable.id, connection.id)).returning();
  return updated || { ...connection, ...updatedValues };
}
