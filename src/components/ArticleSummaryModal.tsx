import { useSwipeCarousel, useSwipeToDismiss } from "@mp/app-kit";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Article } from "../types";
import ArticleSummaryModalBody from "./ArticleSummaryModalBody";
import ArticleSummaryModalFooter from "./ArticleSummaryModalFooter";
import ArticleSummaryModalHeader from "./ArticleSummaryModalHeader";

type ArticleSummaryModalProps = {
  article: Article;
  isRegenerating: boolean;
  summaryError: string | null;
  onClose: () => void;
  onShare: (article: Article) => void;
  onRegenerate: (article: Article) => void;
  /** Index of `article` within the currently browsable list, for prev/next carousel navigation. */
  carouselIndex: number;
  carouselCount: number;
  onNavigate: (nextIndex: number) => void;
};

function CarouselArrows({ index, count, onNavigate }: { index: number; count: number; onNavigate: (next: number) => void }) {
  if (count < 2 || index < 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => onNavigate(index - 1)}
        disabled={index <= 0}
        aria-label="Articolo precedente"
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-full border border-slate-200 bg-white/90 p-2 text-slate-600 shadow-md transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => onNavigate(index + 1)}
        disabled={index >= count - 1}
        aria-label="Articolo successivo"
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-full border border-slate-200 bg-white/90 p-2 text-slate-600 shadow-md transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </>
  );
}

export default function ArticleSummaryModal(props: ArticleSummaryModalProps) {
  // Swipe-down dismiss is a shortcut only: the header close ("X") button
  // remains the primary, always-visible way to dismiss this modal.
  const dismiss = useSwipeToDismiss({ onDismiss: props.onClose });
  // Swipe left/right browses prev/next article; left/right arrow buttons
  // below remain the primary, always-visible equivalent.
  const carousel = useSwipeCarousel({
    index: props.carouselIndex,
    count: props.carouselCount,
    onIndexChange: props.onNavigate,
    disabled: props.carouselCount < 2 || props.carouselIndex < 0,
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs" onClick={props.onClose}>
      <div className="relative w-full max-w-2xl">
        <CarouselArrows index={props.carouselIndex} count={props.carouselCount} onNavigate={props.onNavigate} />
        <div
          className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          style={{
            transform: `translate(${carousel.offset}px, ${Math.max(0, dismiss.offset)}px)`,
            transition: dismiss.isDragging || carousel.isDragging ? "none" : "transform 0.2s ease",
          }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(e) => {
            dismiss.handlers.onPointerDown(e);
            carousel.handlers.onPointerDown(e);
          }}
          onPointerMove={(e) => {
            dismiss.handlers.onPointerMove(e);
            carousel.handlers.onPointerMove(e);
          }}
          onPointerUp={(e) => {
            dismiss.handlers.onPointerUp(e);
            carousel.handlers.onPointerUp(e);
          }}
          onPointerCancel={(e) => {
            dismiss.handlers.onPointerCancel(e);
            carousel.handlers.onPointerCancel(e);
          }}
        >
          <ArticleSummaryModalHeader article={props.article} onShare={props.onShare} onClose={props.onClose} />
          <div className="overflow-y-auto p-6">
            <ArticleSummaryModalBody article={props.article} isRegenerating={props.isRegenerating} summaryError={props.summaryError} />
          </div>
          <ArticleSummaryModalFooter article={props.article} isRegenerating={props.isRegenerating} onRegenerate={props.onRegenerate} onClose={props.onClose} />
        </div>
      </div>
    </div>
  );
}
