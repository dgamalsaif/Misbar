/** Every coordinator write is denied unless it is explicitly a student add/remove or session action. */
export function isAllowedCoordinatorMutation(method: string, path: string): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) return true;
  const normalized = path.replace(/\/+$/, "") || "/";
  return (method === "POST" && [
    "/coordinator/registrations", "/coordinator/login", "/coordinator/logout",
  ].includes(normalized)) ||
    (["POST", "PATCH"].includes(method.toUpperCase()) && [
      "/participant/notifications/access-link",
      "/participant/notifications/verify",
      "/participant/notifications/preferences",
      "/participant/notifications/push-subscriptions",
      "/participant/notifications/push-subscriptions/remove",
      "/participant/notifications/unsubscribe",
      "/participant/notifications/logout",
    ].includes(normalized)) ||
    (method.toUpperCase() === "PATCH" && /^\/participant\/notifications\/[1-9]\d*\/read$/.test(normalized)) ||
    (method.toUpperCase() === "DELETE" && /^\/participant\/notifications\/push-subscriptions\/[1-9]\d*$/.test(normalized)) ||
    (method === "DELETE" && /^\/registrations\/[1-9]\d*$/.test(normalized));
}