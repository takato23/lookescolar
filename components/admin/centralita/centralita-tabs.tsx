"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropsWithChildren, ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type CentralitaTabKey = "overview" | "folders" | "public";

export default function CentralitaTabs({
  children,
  defaultTab = "overview",
}: PropsWithChildren<{ defaultTab?: CentralitaTabKey }>) {
  const router = useRouter();
  const sp = useSearchParams();
  const [activeTab, setActiveTab] = useState<CentralitaTabKey>(
    (sp.get("tab") as CentralitaTabKey) || defaultTab
  );

  // Update active tab when URL query param changes externally
  useEffect(() => {
    const urlTab = (sp.get("tab") as CentralitaTabKey) || defaultTab;
    setActiveTab((prev) => (prev !== urlTab ? urlTab : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // Keep URL in sync
  useEffect(() => {
    const current = new URLSearchParams(Array.from(sp.entries()));
    if (current.get("tab") !== activeTab) {
      current.set("tab", activeTab);
      const qs = current.toString();
      router.replace(`?${qs}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Map provided children by value attr on TabsContent
  const panels = useMemo(() => {
    const acc: Record<string, ReactNode> = {};
    // children are expected to be TabsContent elements
    (Array.isArray(children) ? children : [children]).forEach((ch: any) => {
      if (ch && ch.props && ch.props.value) {
        acc[ch.props.value] = ch;
      }
    });
    return acc;
  }, [children]);

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CentralitaTabKey)} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Centro de Control</TabsTrigger>
        <TabsTrigger value="folders">Carpetas</TabsTrigger>
        <TabsTrigger value="public">Galería Pública</TabsTrigger>
      </TabsList>
      {/* Render panes as provided */}
      {Object.values(panels)}
    </Tabs>
  );
}

export const CentralitaTabsContent = TabsContent;
