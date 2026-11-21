import { ClerkProvider } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { getOpportunityRegistrationPath } from "@/lib/opportunityDisplay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingButtons from "@/components/FloatingButtons";
import BrandBackground from "@/components/BrandBackground";
import Home from "@/pages/Home";
import ParticipantPortal from "@/pages/ParticipantPortal";
import CoordinatorPortal from "@/pages/CoordinatorPortal";
import SpecialRequests from "@/pages/SpecialRequests";
import KnowledgeCenter from "@/pages/KnowledgeCenter";
import KnowledgeArticle from "@/pages/KnowledgeArticle";
import About from "@/pages/About";
import FAQ from "@/pages/FAQ";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminSubmissions from "@/pages/AdminSubmissions";
import ResearchDetail from "@/pages/ResearchDetail";
import OpportunitySurvey from "@/pages/OpportunitySurvey";
import OwnerLogin from "@/pages/OwnerLogin";
import OwnerSignIn from "@/pages/OwnerSignIn";
import OwnerSignUp from "@/pages/OwnerSignUp";
import NotFound from "@/pages/not-found";
import { LanguageProvider, useLanguage } from "@/lib/i18n";
import { CurrencyProvider } from "@/lib/currency";
import { SeoManager, SeoProvider } from "@/lib/seo";
import ThemeSync from "@/components/ThemeSync";
import { AnnouncementBar, DraftPreviewBar, RouteEyebrow } from "@/components/RouteChrome";
import { ExperienceDraftProvider } from "@/lib/experience-draft";
import SiteIdentitySync from "@/components/SiteIdentitySync";
import { ResearchProtectionProvider } from "@/components/ResearchProtection";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const configuredClerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
const clerkPubKey =
  (configuredClerkKey ? publishableKeyFromHost(window.location.hostname, configuredClerkKey) : undefined) ||
  configuredClerkKey ||
  "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k";
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const clerkFapi = (import.meta as any).env.VITE_CLERK_FAPI?.trim();

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: { logoPlacement: "inside" as const, logoLinkUrl: basePath || "/" },
  variables: {
    colorPrimary: "var(--m-primary, #0b5145)", colorForeground: "var(--m-ink, #14231f)", colorMutedForeground: "var(--m-muted, #5d6b66)",
    colorBackground: "var(--m-surface, #fffdf6)", colorInput: "var(--m-bg, #f6f3e8)", colorInputForeground: "var(--m-ink, #14231f)",
    colorDanger: "#b4372c", colorNeutral: "var(--m-line, #d9d4c3)", fontFamily: "var(--m-font-body, 'IBM Plex Sans Arabic', Tajawal, sans-serif)", borderRadius: "var(--m-radius, 1rem)",
  },
  elements: {
    rootBox: "w-full flex justify-center", cardBox: "w-full max-w-md bg-[color:var(--m-surface)] rounded-3xl shadow-xl border border-[color:var(--m-line)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none", footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-900 font-black", headerSubtitle: "text-slate-500", formFieldLabel: "text-slate-700 font-bold",
    formButtonPrimary: "bg-[color:var(--m-primary)] hover:opacity-90", formFieldInput: "bg-slate-50 text-slate-900 border-slate-200",
    footerActionLink: "text-[color:var(--m-primary)]", footerActionText: "text-slate-500",
  },
};

function Router() {
  const [location] = useLocation();
  const { language } = useLanguage();
  const isAdmin = location === "/admin" || location === "/admin/submissions" || location === "/owner-admin" || location === "/sign-in" || location.startsWith("/sign-in/") || location === "/sign-up" || location.startsWith("/sign-up/") || location === "/coordinator/dashboard" || location === "/coordinator/submissions";
  const isCoordinatorPortal = location === "/coordinator" || location === "/coordinator-portal";
  const floatingAudience = location === "/participant-portal" || location.startsWith("/research/") ? "participant" as const : "public" as const;
  const isPrivate = isAdmin || isCoordinatorPortal;

  return (
    <div className="relative flex min-h-[100dvh] flex-col w-full max-w-full overflow-x-clip" style={{ fontFamily: "var(--m-font-body)" }}>
      <SeoManager pathname={location} language={language} />
      <BrandBackground />
      <div className="relative z-10 flex min-h-screen flex-col w-full max-w-full overflow-x-clip">
        <AnnouncementBar />
        {!isPrivate && <Navbar />}
        <RouteEyebrow />
        <main className="flex-1 w-full max-w-full min-w-0">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/participant-portal" component={ParticipantPortal} />
            <Route path="/coordinator" component={CoordinatorPortal} />
            <Route path="/coordinator-portal" component={CoordinatorPortal} />
            <Route path="/special-requests" component={SpecialRequests} />
            <Route path="/knowledge-center" component={KnowledgeCenter} />
            <Route path="/knowledge-center/:slug" component={KnowledgeArticle} />
            <Route path="/about" component={About} />
            <Route path="/faq" component={FAQ} />
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/admin/submissions" component={AdminSubmissions} />
            <Route path="/owner-admin" component={OwnerLogin} />
            <Route path="/sign-in/*?" component={OwnerSignIn} />
            <Route path="/sign-up/*?" component={OwnerSignUp} />
            <Route path="/coordinator/dashboard" component={AdminDashboard} />
            <Route path="/coordinator/submissions" component={AdminSubmissions} />
            <Route path="/research/:id" component={ResearchDetail} />
            <Route path="/share/research/:id">
              {(params) => /^[1-9]\d*$/.test(params.id)
                ? <Redirect to={`${getOpportunityRegistrationPath(Number(params.id))}${new URLSearchParams(window.location.search).get("lang") === "en" ? "&lang=en" : ""}`} />
                : <NotFound />}
            </Route>
            <Route path="/survey" component={OpportunitySurvey} />
            <Route path="/register" component={OpportunitySurvey} />
            <Route component={NotFound} />
          </Switch>
        </main>
        {!isAdmin && !isCoordinatorPortal && <Footer />}
        {!isAdmin && !isCoordinatorPortal && <FloatingButtons audience={floatingAudience} />}
        <DraftPreviewBar />
      </div>
    </div>
  );
}

function App() {
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      domain={clerkFapi || undefined}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
    >
      <QueryClientProvider client={queryClient}>
        <ExperienceDraftProvider>
        <SeoProvider>
        <TooltipProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <SiteIdentitySync />
              <ThemeSync />
              <ResearchProtectionProvider>
                <WouterRouter base={basePath}>
                  <Router />
                </WouterRouter>
              </ResearchProtectionProvider>
            </CurrencyProvider>
          </LanguageProvider>
          <Toaster />
        </TooltipProvider>
        </SeoProvider>
        </ExperienceDraftProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
