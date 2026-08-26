import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useSwipeToDismiss } from "@mp/app-kit";

interface ConfirmOverlayProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  confirmingLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

interface OverlayHeaderProps {
  danger: boolean;
  title: string;
}

function OverlayHeader({ danger, title }: OverlayHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
        danger
          ? "bg-rose-50 dark:bg-rose-950/70 border border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400"
          : "bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400"
      }`}>
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
    </div>
  );
}

interface OverlayActionsProps {
  accentColor: string;
  isConfirming: boolean;
  cancelLabel: string;
  confirmLabel: string;
  confirmingLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function OverlayActions({
  accentColor,
  isConfirming,
  cancelLabel,
  confirmLabel,
  confirmingLabel,
  onCancel,
  onConfirm,
}: OverlayActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={onCancel}
        disabled={isConfirming}
        className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cancelLabel}
      </button>
      <button
        onClick={onConfirm}
        disabled={isConfirming}
        className={`inline-flex items-center gap-2 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer ${
          accentColor === "rose" ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
        }`}
      >
        {isConfirming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {isConfirming ? confirmingLabel : confirmLabel}
      </button>
    </div>
  );
}

// Reusable in-page confirmation overlay: replaces window.confirm() everywhere
// in the app, so destructive/important actions always get a consistent,
// accessible, themeable confirmation UI instead of the browser-native dialog.
export default function ConfirmOverlay({
  isOpen,
  title,
  message,
  confirmLabel = "Conferma",
  confirmingLabel = "Attendere...",
  cancelLabel = "Annulla",
  isConfirming = false,
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmOverlayProps) {
  if (!isOpen) return null;

  const accentColor = danger ? "rose" : "indigo";
  // Swipe-down dismiss acts as cancel — a shortcut only, the Annulla
  // button remains the primary, always-visible way to dismiss.
  const { offset, isDragging, handlers } = useSwipeToDismiss({ onDismiss: onCancel, disabled: isConfirming });

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => !isConfirming && onCancel()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        style={{ transform: `translateY(${Math.max(0, offset)}px)`, transition: isDragging ? "none" : "transform 0.2s ease" }}
        onClick={(e) => e.stopPropagation()}
        {...handlers}
      >
        <OverlayHeader danger={danger} title={title} />
        <div className="text-sm text-slate-600 dark:text-slate-400 mb-5">
          {message}
        </div>
        <OverlayActions
          accentColor={accentColor}
          isConfirming={isConfirming}
          cancelLabel={cancelLabel}
          confirmLabel={confirmLabel}
          confirmingLabel={confirmingLabel}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </div>
    </div>
  );
}
