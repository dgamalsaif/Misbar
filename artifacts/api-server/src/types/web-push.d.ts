declare module "web-push" {
  interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  interface PushError extends Error {
    statusCode?: number;
  }

  interface WebPush {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
    sendNotification(
      subscription: PushSubscription,
      payload?: string | Buffer | null,
      options?: { TTL?: number; urgency?: "very-low" | "low" | "normal" | "high" },
    ): Promise<unknown>;
  }

  const webPush: WebPush;
  export default webPush;
}
