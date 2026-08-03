import { Suspense, lazy } from "react";
import { Capacitor } from "@capacitor/core";

import App from "./App.tsx";

const MobileApp = lazy(async () => {
  const module = await import("./mobile/MobileApp");
  return { default: module.MobileApp };
});

// ネイティブ（Capacitor）はモバイルUI、Webは既存UI。`?mobile` はブラウザ検証用。
function shouldUseMobileUi() {
  return Capacitor.isNativePlatform() || new URLSearchParams(window.location.search).has("mobile");
}

export function Root() {
  if (!shouldUseMobileUi()) {
    return <App />;
  }

  return (
    <Suspense fallback={null}>
      <MobileApp />
    </Suspense>
  );
}
