"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/components/i18n/provider";
import { createClient } from "@/lib/supabase/browser";

export const LogoutButton = () => {
  const { t } = useI18n();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    const supabase = createClient();
    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  };

  return (
    <button className="secondary-button" onClick={handleLogout} type="button">
      {isLoading ? `${t("common.signOut")}...` : t("common.signOut")}
    </button>
  );
};
