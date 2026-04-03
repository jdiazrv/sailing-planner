"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useI18n } from "@/components/i18n/provider";
import { createClient } from "@/lib/supabase/browser";

export const LogoutButton = ({
  className = "secondary-button",
  children,
}: {
  className?: string;
  children?: ReactNode;
}) => {
  const { t } = useI18n();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button className={className} onClick={handleLogout} type="button">
      {children ?? (isLoading ? `${t("common.signOut")}...` : t("common.signOut"))}
    </button>
  );
};
