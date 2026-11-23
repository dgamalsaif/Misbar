import type { SocialConnection } from "@workspace/db";
import { decryptSocialSecret } from "./socialSecurity";
import type { SocialPostContent } from "./socialPostContent";

export class SocialProviderError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly outcomeUnknown = false,
  ) {
    super(message);
    this.name = "SocialProviderError";
  }
}

function socialApiTimeout() {
  return AbortSignal.timeout(25_000);
}

async function readJson(response: Response, provider: string) {
  const text = await response.text();
  let data: Record<string, any> = {};
  try {
    data = text ? JSON.parse(text) as Record<string, any> : {};
  } catch {
    data = {};
  }
  if (!response.ok || data.ok === false) {
    const rawMessage = typeof data.error?.message === "string"
      ? data.error.message
      : typeof data.detail === "string"
        ? data.detail
        : typeof data.message === "string"
          ? data.message
          : `HTTP ${response.status}`;
    const cleanMessage = rawMessage
      .replace(/\b(?:EA[A-Za-z0-9]{20,}|[A-Za-z0-9_-]{45,})\b/g, "[redacted]")
      .replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").slice(0, 260);
    throw new SocialProviderError(
      `${provider}: ${cleanMessage}`,
      response.status,
      response.status >= 500,
    );
  }
  return data;
}

async function postForm(url: string, fields: URLSearchParams, provider: string) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: fields,
      signal: socialApiTimeout(),
    });
  } catch {
    throw new SocialProviderError(`${provider}: تعذر الوصول إلى الخدمة؛ تحقق من حالة المنشور قبل إعادة المحاولة.`, undefined, true);
  }
  return readJson(response, provider);
}

async function postJson(url: string, accessToken: string, value: unknown, provider: string) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(value),
      signal: socialApiTimeout(),
    });
  } catch {
    throw new SocialProviderError(`${provider}: انقطع الاتصال أثناء النشر؛ تحقق من الحساب قبل إعادة المحاولة.`, undefined, true);
  }
  return readJson(response, provider);
}

function metaVersion() {
  const version = process.env["META_GRAPH_API_VERSION"]?.trim();
  if (!version || !/^v\d{1,2}\.\d$/.test(version)) {
    throw new SocialProviderError("Meta: لم تُضبط نسخة Graph API في إعدادات الخادم.");
  }
  return version;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function publishFacebookPage(
  connection: SocialConnection,
  content: SocialPostContent,
) {
  const token = decryptSocialSecret(connection.accessTokenEncrypted);
  const version = metaVersion();
  const message = content.text.split("\n").slice(0, -1).join("\n");
  return postForm(
    `https://graph.facebook.com/${version}/${encodeURIComponent(connection.accountId)}/feed`,
    new URLSearchParams({ message, link: content.shareUrl, access_token: token }),
    "Facebook",
  ).then((data) => {
    if (typeof data.id !== "string") {
      throw new SocialProviderError("Facebook: لم تُؤكد المنصة رقم المنشور؛ تحقق من الصفحة قبل إعادة المحاولة.", undefined, true);
    }
    return data.id;
  });
}

export async function publishInstagram(
  connection: SocialConnection,
  content: SocialPostContent,
) {
  const token = decryptSocialSecret(connection.accessTokenEncrypted);
  const version = metaVersion();
  const instagramUserId = String(connection.metadata["instagramUserId"] || connection.accountId);
  const created = await postForm(
    `https://graph.facebook.com/${version}/${encodeURIComponent(instagramUserId)}/media`,
    new URLSearchParams({
      image_url: content.imageUrl,
      caption: content.text,
      access_token: token,
    }),
    "Instagram",
  );
  if (typeof created.id !== "string") {
    throw new SocialProviderError("Instagram: لم تُنشأ صورة المنشور.", undefined, true);
  }
  const published = await postForm(
    `https://graph.facebook.com/${version}/${encodeURIComponent(instagramUserId)}/media_publish`,
    new URLSearchParams({ creation_id: created.id, access_token: token }),
    "Instagram",
  );
  if (typeof published.id !== "string") {
    throw new SocialProviderError("Instagram: لم تُؤكد المنصة نشر الصورة؛ تحقق من الحساب قبل إعادة المحاولة.", undefined, true);
  }
  return published.id;
}

export async function publishXPost(
  connection: SocialConnection,
  content: SocialPostContent,
) {
  const token = decryptSocialSecret(connection.accessTokenEncrypted);
  const data = await postJson("https://api.x.com/2/tweets", token, { text: content.text }, "X");
  if (typeof data.data?.id !== "string") {
    throw new SocialProviderError("X: لم تُؤكد المنصة رقم المنشور؛ تحقق من الحساب قبل إعادة المحاولة.", undefined, true);
  }
  return data.data.id;
}

export async function publishTelegramMessage(
  connection: SocialConnection,
  content: SocialPostContent,
) {
  const token = decryptSocialSecret(connection.accessTokenEncrypted);
  const chatId = String(connection.metadata["chatId"] || connection.accountId);
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: content.text,
        link_preview_options: { is_disabled: false },
      }),
      signal: socialApiTimeout(),
    });
  } catch {
    throw new SocialProviderError("Telegram: انقطع الاتصال أثناء النشر؛ تحقق من القناة قبل إعادة المحاولة.", undefined, true);
  }
  const data = await readJson(response, "Telegram");
  if (typeof data.result?.message_id !== "number") {
    throw new SocialProviderError("Telegram: لم تُؤكد القناة استلام الرسالة؛ تحقق من القناة قبل إعادة المحاولة.", undefined, true);
  }
  return String(data.result.message_id);
}

export async function publishToConnection(
  connection: SocialConnection,
  content: SocialPostContent,
) {
  switch (connection.platform) {
    case "facebook":
      return publishFacebookPage(connection, content);
    case "instagram":
      return publishInstagram(connection, content);
    case "x":
      return publishXPost(connection, content);
    case "telegram":
      return publishTelegramMessage(connection, content);
    default:
      throw new SocialProviderError("منصة التواصل غير مدعومة.");
  }
}

export async function verifyTelegramBot(token: string, chatId: string) {
  const base = `https://api.telegram.org/bot${token}`;
  const getMeResponse = await fetch(`${base}/getMe`, { signal: socialApiTimeout() }).catch(() => null);
  if (!getMeResponse) throw new SocialProviderError("Telegram: تعذر الاتصال بخدمة البوت.");
  const botData = await readJson(getMeResponse, "Telegram");
  const botId = botData.result?.id;
  const botName = typeof botData.result?.username === "string" ? `@${botData.result.username}` : "Telegram bot";
  if (!Number.isInteger(botId)) throw new SocialProviderError("Telegram: رمز البوت غير صالح.");

  const memberUrl = new URL(`${base}/getChatMember`);
  memberUrl.searchParams.set("chat_id", chatId);
  memberUrl.searchParams.set("user_id", String(botId));
  const memberResponse = await fetch(memberUrl, { signal: socialApiTimeout() }).catch(() => null);
  if (!memberResponse) throw new SocialProviderError("Telegram: تعذر التحقق من صلاحية البوت في القناة.");
  const memberData = await readJson(memberResponse, "Telegram");
  const member = memberData.result || {};
  const isAdmin = member.status === "administrator" || member.status === "creator";
  const canPost = member.status === "creator" || member.can_post_messages === true;
  if (!isAdmin || !canPost) {
    throw new SocialProviderError("Telegram: أضف البوت مشرفاً مع صلاحية إرسال الرسائل في القناة.");
  }

  const chatUrl = new URL(`${base}/getChat`);
  chatUrl.searchParams.set("chat_id", chatId);
  const chatResponse = await fetch(chatUrl, { signal: socialApiTimeout() }).catch(() => null);
  if (!chatResponse) throw new SocialProviderError("Telegram: تعذر قراءة بيانات القناة.");
  const chatData = await readJson(chatResponse, "Telegram");
  const chat = chatData.result || {};
  return {
    botName,
    accountId: String(chat.id || chatId),
    accountName: typeof chat.title === "string" ? chat.title : typeof chat.username === "string" ? `@${chat.username}` : String(chatId),
  };
}

