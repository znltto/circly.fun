"use client";

import * as React from "react";
import {
  FileText,
  ListChecks,
  Gavel,
  Users,
  ClipboardCopy,
  Check,
  Download,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionItem {
  task: string;
  owner?: string;
  when?: string;
}

interface Props {
  summary: string;
  topics: string[];
  decisions: string[];
  actionItems: ActionItem[];
  participants: string[];
  transcript: string;
}

type Tab = "resumo" | "topicos" | "decisoes" | "acoes" | "transcript";

const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: "resumo", label: "Resumo", icon: FileText },
  { id: "topicos", label: "Tópicos", icon: ScrollText },
  { id: "decisoes", label: "Decisões", icon: Gavel },
  { id: "acoes", label: "Action items", icon: ListChecks },
  { id: "transcript", label: "Transcript", icon: FileText },
];

export function RecordingDetail(props: Props) {
  const [tab, setTab] = React.useState<Tab>("resumo");
  const [copied, setCopied] = React.useState(false);

  const markdown = buildMarkdown(props);

  async function copyAll() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadMd() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reuniao-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-md border border-border bg-surface">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <nav className="flex flex-wrap items-center gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors",
                tab === id
                  ? "bg-brand/10 text-brand"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            onClick={copyAll}
            className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-brand/40 hover:text-brand"
            title="Copiar tudo em markdown"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-success" />
                Copiado
              </>
            ) : (
              <>
                <ClipboardCopy className="h-3.5 w-3.5" />
                Copiar
              </>
            )}
          </button>
          <button
            onClick={downloadMd}
            className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-brand/40 hover:text-brand"
            title="Baixar como arquivo .md"
          >
            <Download className="h-3.5 w-3.5" />
            Markdown
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {tab === "resumo" && (
          <div className="space-y-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
              {props.summary || "Sem resumo disponível."}
            </p>
            {props.participants.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-text-muted">
                  <Users className="h-3 w-3" />
                  Participantes mencionados
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {props.participants.map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-border bg-surface-raised px-2.5 py-0.5 text-xs text-text-secondary"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "topicos" && (
          <BulletList
            items={props.topics}
            emptyLabel="Nenhum tópico identificado."
          />
        )}

        {tab === "decisoes" && (
          <BulletList
            items={props.decisions}
            emptyLabel="Nenhuma decisão explícita registrada."
          />
        )}

        {tab === "acoes" && (
          <div>
            {props.actionItems.length === 0 ? (
              <p className="text-sm text-text-muted">
                Nenhum action item identificado.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {props.actionItems.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-sm border border-border bg-surface-raised p-3"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-border font-mono text-[10px] text-text-muted">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-text-primary">{a.task}</p>
                      {(a.owner || a.when) && (
                        <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-text-muted">
                          {a.owner && (
                            <span>
                              <span className="text-text-secondary">Responsável:</span>{" "}
                              {a.owner}
                            </span>
                          )}
                          {a.when && (
                            <span>
                              <span className="text-text-secondary">Prazo:</span>{" "}
                              {a.when}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "transcript" && (
          <div className="max-h-[600px] overflow-y-auto scrollbar-slim rounded-sm border border-border bg-surface-raised p-4">
            <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-text-secondary">
              {props.transcript || "Transcript indisponível."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BulletList({
  items,
  emptyLabel,
}: {
  items: string[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-text-muted">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" />
          <span className="text-text-primary">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function buildMarkdown(p: Props): string {
  const lines: string[] = [];
  lines.push("# Resumo da reunião");
  lines.push("");
  if (p.summary) {
    lines.push(p.summary);
    lines.push("");
  }
  if (p.participants.length > 0) {
    lines.push("## Participantes");
    for (const person of p.participants) lines.push(`- ${person}`);
    lines.push("");
  }
  if (p.topics.length > 0) {
    lines.push("## Tópicos");
    for (const t of p.topics) lines.push(`- ${t}`);
    lines.push("");
  }
  if (p.decisions.length > 0) {
    lines.push("## Decisões");
    for (const d of p.decisions) lines.push(`- ${d}`);
    lines.push("");
  }
  if (p.actionItems.length > 0) {
    lines.push("## Action items");
    for (const a of p.actionItems) {
      const extras: string[] = [];
      if (a.owner) extras.push(`_@${a.owner}_`);
      if (a.when) extras.push(`_${a.when}_`);
      lines.push(
        `- [ ] ${a.task}${extras.length > 0 ? " " + extras.join(" · ") : ""}`
      );
    }
    lines.push("");
  }
  if (p.transcript) {
    lines.push("---");
    lines.push("## Transcript completo");
    lines.push("");
    lines.push(p.transcript);
  }
  return lines.join("\n");
}
