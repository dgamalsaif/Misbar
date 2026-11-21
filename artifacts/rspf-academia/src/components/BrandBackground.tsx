import { useSiteContentSettings } from "@/hooks/use-site-content-settings";

/** Page backdrop. Pattern is selected by experience.theme.backgroundPattern via html[data-pattern]. */
export default function BrandBackground() {
  const { data } = useSiteContentSettings();
  const logo = data.brand.logoUrl;
  return (
    <div aria-hidden="true" className="m-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="m-backdrop-pattern absolute inset-0" />
      {logo && <img src={logo} alt="" className="absolute -bottom-24 h-[min(60vw,640px)] w-[min(60vw,640px)] rounded-full object-cover opacity-[0.03] ltr:-right-24 rtl:-left-24" />}
    </div>
  );
}
