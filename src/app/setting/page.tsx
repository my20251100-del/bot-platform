import { Suspense } from "react";
import SiteHeader from "@/components/site-header";
import SettingClient from "./client";

export default function SettingPage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<div className="p-12 text-center text-muted">جارٍ تحميل لوحة التحكم...</div>}>
        <SettingClient />
      </Suspense>
    </>
  );
}
