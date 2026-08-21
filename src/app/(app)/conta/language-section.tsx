"use client";

import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useI18n } from "@/lib/i18n/context";

export function LanguageSection() {
  const { t } = useI18n();
  return (
    <section
      aria-labelledby="conta-idioma-heading"
      className="rounded-lg border border-border bg-surface p-6"
    >
      <h2
        id="conta-idioma-heading"
        className="font-serif text-lg text-text-primary"
      >
        {t("account.languageHeading")}
      </h2>
      <p className="mt-2 text-sm text-text-secondary">
        {t("account.languageDescription")}
      </p>

      <div className="mt-5 space-y-1.5">
        <label
          htmlFor="conta-lang-select"
          className="text-xs font-medium text-text-secondary"
        >
          {t("account.languageLabel")}
        </label>
        <LanguageSwitcher
          variant="block"
          align="left"
          idPrefix="conta-lang"
        />
      </div>
    </section>
  );
}
