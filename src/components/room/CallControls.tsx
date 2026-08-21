"use client";

import * as React from "react";
import {
  useLocalParticipant,
  useTrackToggle,
  useRoomContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  MessageSquare,
  Users,
  Phone,
  ChevronUp,
  Check,
  Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LockToggle } from "./LockToggle";
import { HandRaiseButton } from "./HandRaise";
import { SpotlightToggle } from "./spotlight-context";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------
 * Modo do microfone — persistido em localStorage
 * ------------------------------------------------------------------ */

type MicMode = "always-on" | "always-off" | "ptt";

const MIC_MODE_KEY = "circly:mic-mode";
const PTT_KEY_KEY = "circly:ptt-key";
const DEFAULT_PTT_KEY = "Space";

function loadMicMode(): MicMode {
  if (typeof window === "undefined") return "always-on";
  const v = window.localStorage.getItem(MIC_MODE_KEY);
  if (v === "always-on" || v === "always-off" || v === "ptt") return v;
  return "always-on";
}

function loadPttKey(): string {
  if (typeof window === "undefined") return DEFAULT_PTT_KEY;
  return window.localStorage.getItem(PTT_KEY_KEY) || DEFAULT_PTT_KEY;
}

/** Rótulo humano da tecla — mapeia `code` do KeyboardEvent. */
function keyLabel(code: string): string {
  const map: Record<string, string> = {
    Space: "Espaço",
    ShiftLeft: "Shift ⇧",
    ShiftRight: "Shift ⇧",
    ControlLeft: "Ctrl",
    ControlRight: "Ctrl",
    AltLeft: "Alt",
    AltRight: "Alt",
    Tab: "Tab",
    Enter: "Enter",
  };
  if (map[code]) return map[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("F") && code.length <= 3) return code;
  return code;
}

/* ------------------------------------------------------------------
 * Componente principal
 * ------------------------------------------------------------------ */

interface CallControlsProps {
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  chatOpen: boolean;
  participantsOpen: boolean;
  unreadChat: number;
  onLeave: () => void;
}

export function CallControls({
  onToggleChat,
  onToggleParticipants,
  chatOpen,
  participantsOpen,
  unreadChat,
  onLeave,
}: CallControlsProps) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  const mic = useTrackToggle({ source: Track.Source.Microphone });
  const cam = useTrackToggle({ source: Track.Source.Camera });

  const micOn = mic.enabled ?? localParticipant.isMicrophoneEnabled;
  const camOn = cam.enabled ?? localParticipant.isCameraEnabled;
  const screenOn = localParticipant.isScreenShareEnabled;

  const [confirmingLeave, setConfirmingLeave] = React.useState(false);
  const [micMode, setMicMode] = React.useState<MicMode>("always-on");
  const [pttKey, setPttKey] = React.useState<string>(DEFAULT_PTT_KEY);
  const [pttPressed, setPttPressed] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Hidrata preferências do localStorage (client-only)
  React.useEffect(() => {
    setMicMode(loadMicMode());
    setPttKey(loadPttKey());
  }, []);

  // Salva mudanças
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MIC_MODE_KEY, micMode);
  }, [micMode]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PTT_KEY_KEY, pttKey);
  }, [pttKey]);

  /* --- Aplica estado inicial do mic quando o modo muda ------------ */
  React.useEffect(() => {
    if (micMode === "always-on") {
      void localParticipant.setMicrophoneEnabled(true);
    } else if (micMode === "always-off" || micMode === "ptt") {
      void localParticipant.setMicrophoneEnabled(false);
    }
  }, [micMode, localParticipant]);

  /* --- PTT: hold key para falar ----------------------------------- */
  React.useEffect(() => {
    if (micMode !== "ptt") return;

    function isTypingTarget(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== pttKey) return;
      if (e.repeat) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setPttPressed(true);
      void localParticipant.setMicrophoneEnabled(true);
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== pttKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setPttPressed(false);
      void localParticipant.setMicrophoneEnabled(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      setPttPressed(false);
    };
  }, [micMode, pttKey, localParticipant]);

  /* --- Screen share com áudio do sistema --------------------------- */
  async function toggleScreenShare() {
    if (screenOn) {
      await localParticipant.setScreenShareEnabled(false);
      return;
    }
    try {
      await localParticipant.setScreenShareEnabled(true, { audio: true });
    } catch (err) {
      console.warn("[screen] falha ao compartilhar:", err);
    }
  }

  async function performLeave() {
    setConfirmingLeave(false);
    await room.disconnect();
    onLeave();
  }

  /* --- Toggle do mic pelo botão principal ------------------------- */
  function handleMicClick() {
    if (micMode === "ptt") {
      // PTT controla via tecla — clique só troca pra sempre ligado
      setMicMode("always-on");
      return;
    }
    void mic.toggle();
    // Sincroniza modo com o estado clicado
    setMicMode(micOn ? "always-off" : "always-on");
  }

  const micLabel =
    micMode === "ptt"
      ? pttPressed
        ? `Falando (soltar ${keyLabel(pttKey)} para mutar)`
        : `PTT: segure ${keyLabel(pttKey)} para falar`
      : micOn
        ? "Silenciar microfone"
        : "Ativar microfone";

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-1.5 border-t border-border bg-background px-2 py-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.625rem)] sm:gap-2 sm:px-4 sm:py-3"
    >
      {/* Split button do microfone */}
      <div className="flex items-stretch">
        <ControlButton
          tone={micOn ? "brand" : "muted"}
          onClick={handleMicClick}
          label={micLabel}
          className={cn(
            "rounded-r-none",
            micMode === "ptt" && pttPressed && "ring-2 ring-brand/60"
          )}
        >
          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </ControlButton>
        <MicModeMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          mode={micMode}
          onMode={setMicMode}
          pttKey={pttKey}
          onPttKey={setPttKey}
        />
      </div>

      <ControlButton
        tone={camOn ? "brand" : "muted"}
        onClick={cam.toggle}
        label={camOn ? "Desligar câmera" : "Ligar câmera"}
      >
        {camOn ? (
          <Video className="h-4 w-4" />
        ) : (
          <VideoOff className="h-4 w-4" />
        )}
      </ControlButton>

      <ControlButton
        tone={screenOn ? "brand" : "neutral"}
        onClick={toggleScreenShare}
        label={screenOn ? "Parar compartilhamento" : "Compartilhar tela"}
      >
        {screenOn ? (
          <ScreenShareOff className="h-4 w-4" />
        ) : (
          <ScreenShare className="h-4 w-4" />
        )}
      </ControlButton>

      <span className="mx-2 hidden h-6 w-px bg-border sm:inline-block" />

      <ControlButton
        tone={participantsOpen ? "brand" : "neutral"}
        onClick={onToggleParticipants}
        label="Pessoas"
      >
        <Users className="h-4 w-4" />
      </ControlButton>

      <div className="relative">
        <ControlButton
          tone={chatOpen ? "brand" : "neutral"}
          onClick={onToggleChat}
          label="Chat"
        >
          <MessageSquare className="h-4 w-4" />
        </ControlButton>
        {unreadChat > 0 && !chatOpen && (
          <span
            className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-medium text-brand-fg"
            aria-label={`${unreadChat} mensagens não lidas`}
          >
            {unreadChat > 9 ? "9+" : unreadChat}
          </span>
        )}
      </div>

      {/* Mão levantada — visível pra todos */}
      <HandRaiseButton />

      {/* Auto-focar quem fala */}
      <SpotlightToggle />

      {/* Lock só aparece pro host — o próprio componente se autoescala. */}
      <LockToggle />

      <span className="mx-2 hidden h-6 w-px bg-border sm:inline-block" />

      {/* Sair: sempre presente. Em mobile compacto usa botão circular
          igual aos demais controles (evita transbordar linha). */}
      <button
        onClick={() => setConfirmingLeave(true)}
        aria-label="Sair da sala"
        title="Sair da sala"
        className={cn(
          "flex h-10 items-center justify-center gap-2 rounded-full bg-danger/15 text-danger transition-colors hover:bg-danger/25",
          "w-10 sm:w-auto sm:px-4"
        )}
      >
        <Phone className="h-4 w-4 rotate-[135deg]" />
        <span className="hidden text-sm font-medium sm:inline">Sair</span>
      </button>

      {confirmingLeave && (
        <LeaveConfirmDialog
          onConfirm={performLeave}
          onCancel={() => setConfirmingLeave(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
 * Menu do modo do microfone (dropdown do split-button)
 * ------------------------------------------------------------------ */

function MicModeMenu({
  open,
  onOpenChange,
  mode,
  onMode,
  pttKey,
  onPttKey,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: MicMode;
  onMode: (m: MicMode) => void;
  pttKey: string;
  onPttKey: (k: string) => void;
}) {
  const [capturingKey, setCapturingKey] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      onOpenChange(false);
      setCapturingKey(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onOpenChange]);

  // Captura próxima tecla pressionada quando "Trocar" está ativo
  React.useEffect(() => {
    if (!capturingKey) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setCapturingKey(false);
        return;
      }
      if (e.code) {
        e.preventDefault();
        onPttKey(e.code);
        setCapturingKey(false);
      }
    }
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [capturingKey, onPttKey]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => onOpenChange(!open)}
        aria-label="Opções do microfone"
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex h-10 w-6 items-center justify-center rounded-l-none rounded-r-full border-l border-background transition-colors",
          "bg-surface-raised text-text-muted hover:bg-surface-hover hover:text-brand",
          mode === "ptt" && "bg-brand/15 text-brand hover:bg-brand/25"
        )}
      >
        <ChevronUp
          className={cn(
            "h-3 w-3 transition-transform",
            open ? "" : "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-30 mb-2 w-64 rounded-md border border-border bg-surface-raised p-1 shadow-lg shadow-black/40"
        >
          <MenuRadio
            selected={mode === "always-on"}
            onClick={() => {
              onMode("always-on");
              onOpenChange(false);
            }}
            label="Sempre ligado"
            hint="Microfone aberto o tempo todo."
          />
          <MenuRadio
            selected={mode === "always-off"}
            onClick={() => {
              onMode("always-off");
              onOpenChange(false);
            }}
            label="Sempre desligado"
            hint="Você fica mudo até ligar manualmente."
          />
          <MenuRadio
            selected={mode === "ptt"}
            onClick={() => {
              onMode("ptt");
            }}
            label="Push-to-talk"
            hint={`Segurar tecla para falar.`}
          />

          {mode === "ptt" && (
            <div className="mt-1 border-t border-border pt-2">
              <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Keyboard className="h-3.5 w-3.5 text-text-muted" />
                  Tecla:
                  <kbd className="ml-1 rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-text-primary">
                    {keyLabel(pttKey)}
                  </kbd>
                </span>
                <button
                  onClick={() => setCapturingKey(true)}
                  className={cn(
                    "rounded-sm px-2 py-1 text-[10px] font-medium transition-colors",
                    capturingKey
                      ? "bg-brand text-brand-fg animate-pulse"
                      : "text-brand hover:bg-brand/10"
                  )}
                >
                  {capturingKey ? "Pressione..." : "Trocar"}
                </button>
              </div>
              {capturingKey && (
                <p className="px-3 pb-2 text-[10px] text-text-muted">
                  Pressione qualquer tecla. Esc para cancelar.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuRadio({
  selected,
  onClick,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      role="menuitemradio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-sm px-3 py-2 text-left text-sm transition-colors",
        "hover:bg-surface-hover",
        selected ? "text-text-primary" : "text-text-secondary"
      )}
    >
      <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        {selected && <Check className="h-3.5 w-3.5 text-brand" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        {hint && (
          <span className="block text-[11px] text-text-muted">{hint}</span>
        )}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------
 * Dialog de confirmação de saída
 * ------------------------------------------------------------------ */

function LeaveConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <>
      <div
        aria-hidden
        onClick={onCancel}
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
      />
      <div
        role="alertdialog"
        aria-labelledby="leave-title"
        aria-describedby="leave-desc"
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-xl"
      >
        <h2 id="leave-title" className="font-serif text-xl text-text-primary">
          Sair da sala?
        </h2>
        <p id="leave-desc" className="mt-2 text-sm text-text-secondary">
          Você pode voltar depois pelo mesmo link, se a sala ainda estiver
          aberta.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Ficar
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            leftIcon={<Phone className="h-4 w-4 rotate-[135deg]" />}
          >
            Sair da sala
          </Button>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------
 * Botão base
 * ------------------------------------------------------------------ */

type Tone = "neutral" | "brand" | "muted";

function ControlButton({
  children,
  onClick,
  tone,
  label,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone: Tone;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={tone === "brand"}
      title={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        tone === "brand" && "bg-brand/15 text-brand hover:bg-brand/25",
        tone === "muted" &&
          "bg-surface-raised text-text-muted hover:bg-surface-hover hover:text-brand",
        tone === "neutral" &&
          "bg-surface-raised text-text-secondary hover:bg-surface-hover hover:text-brand",
        className
      )}
    >
      {children}
    </button>
  );
}
