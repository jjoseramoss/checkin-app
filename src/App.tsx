import { useState } from "react";
import { Dashboard } from "@/pages/Dashboard";
import { Feed } from "@/pages/Feed";
import { Profile } from "@/pages/Profile";
import { WeightTracker } from "@/pages/WeightTracker";
import { DietTracker } from "@/pages/DietTracker";
import { Friends } from "@/pages/Friends";
import { Auth } from "@/pages/Auth";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/hooks/useMyProfile";
import type { Route } from "@/lib/routes";

export default function App() {
  const { isAuthed, isLoading } = useAuth();
  const myProfile = useMyProfile();
  const [route, setRoute] = useState<Route>("dashboard");

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!isAuthed) {
    return <Auth />;
  }

  return (
    <div className="flex min-h-screen md:h-screen">
      <Sidebar route={route} onNavigate={setRoute} />

      <div className="flex min-h-screen flex-1 flex-col md:h-screen md:min-h-0 md:overflow-y-auto">
        <TopBar route={route} onNavigate={setRoute} />

        <main className="flex-1">
          {route === "dashboard" && <Dashboard />}
          {route === "feed" && <Feed />}
          {route === "weight" && <WeightTracker />}
          {route === "diet" && <DietTracker />}
          {route === "friends" && <Friends />}
          {route === "profile" && <Profile />}
        </main>
      </div>

      <BottomNav route={route} onNavigate={setRoute} />

      {!myProfile.isLoading && !myProfile.onboarded && (
        <OnboardingFlow
          profile={myProfile.profile}
          updateProfile={myProfile.updateProfile}
          uploadAvatar={myProfile.uploadAvatar}
          onDone={myProfile.completeOnboarding}
        />
      )}
    </div>
  );
}
