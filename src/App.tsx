import { useState } from "react";
import { Dashboard } from "@/pages/Dashboard";
import { Feed } from "@/pages/Feed";
import { Profile } from "@/pages/Profile";
import { BottomNav, type Route } from "@/components/BottomNav";

export default function App() {
  const [route, setRoute] = useState<Route>("dashboard");

  return (
    <div className="min-h-screen">
      {route === "dashboard" && <Dashboard />}
      {route === "feed" && <Feed />}
      {route === "profile" && <Profile />}
      <BottomNav route={route} onNavigate={setRoute} />
    </div>
  );
}
