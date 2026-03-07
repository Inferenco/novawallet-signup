import { useEffect, useMemo, useState } from "react";
import { parseTermsMarkdown, type MarkdownInlineSegment, type TermsMarkdownBlock } from "../../utils/casino/termsMarkdown";
import "../../styles/poker-modals.css";

interface CasinoDisclaimerModalProps {
  visible: boolean;
  onAcknowledge?: () => void | Promise<void>;
  allowClose?: boolean;
  onClose?: () => void;
  allowAcknowledge?: boolean;
  termsMarkdown?: string;
  termsFormat?: string;
  title?: string;
  isLoadingTerms?: boolean;
  termsError?: string | null;
  onRetryLoadTerms?: () => void;
  isSubmittingAcknowledge?: boolean;
}

function renderInlineSegments(segments: MarkdownInlineSegment[]) {
  return segments.map((segment, index) =>
    segment.bold ? <strong key={index}>{segment.text}</strong> : <span key={index}>{segment.text}</span>
  );
}

function isAcknowledgmentParagraph(block: TermsMarkdownBlock): boolean {
  if (block.type !== "paragraph") return false;
  const text = block.segments.map((segment) => segment.text).join("").trim().toLowerCase();
  return text.startsWith('by clicking "i understand and agree"');
}

export function CasinoDisclaimerModal({
  visible,
  onAcknowledge,
  allowClose = false,
  onClose,
  allowAcknowledge = true,
  termsMarkdown = "",
  termsFormat = "text/markdown",
  title,
  isLoadingTerms = false,
  termsError = null,
  onRetryLoadTerms,
  isSubmittingAcknowledge = false
}: CasinoDisclaimerModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const parsedTerms = useMemo(() => parseTermsMarkdown(termsMarkdown), [termsMarkdown]);
  const modalTitle = (title || parsedTerms.title || "Casino Notice").trim();

  useEffect(() => {
    if (visible) {
      setHasScrolledToBottom(false);
    }
  }, [termsError, termsMarkdown, visible]);

  if (!visible) return null;

  const isContentReady = !isLoadingTerms && !termsError && termsMarkdown.trim().length > 0;
  const canAcknowledge =
    allowAcknowledge && isContentReady && hasScrolledToBottom && !isSubmittingAcknowledge;

  return (
    <div className="games-overlay" role="dialog" aria-modal="true">
      <div className="games-modal-panel games-disclaimer-panel">
        <div className="games-modal-header">
          <h3 className="games-modal-title">{modalTitle}</h3>
          {allowClose ? (
            <button type="button" className="games-icon-button" onClick={onClose}>
              ✕
            </button>
          ) : null}
        </div>

        <div
          className="games-disclaimer-scroll"
          onScroll={(event) => {
            const target = event.currentTarget;
            const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 24;
            if (nearBottom) {
              setHasScrolledToBottom(true);
            }
          }}
        >
          {isLoadingTerms ? <p className="games-status-text">Loading terms...</p> : null}
          {!isLoadingTerms && termsError ? (
            <div className="games-section">
              <p className="games-status-text games-status-error">{termsError}</p>
              {onRetryLoadTerms ? (
                <button
                  type="button"
                  className="games-button games-button-secondary"
                  onClick={onRetryLoadTerms}
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}
          {!isLoadingTerms && !termsError && termsMarkdown.trim().length === 0 ? (
            <p className="games-status-text">Terms are not available right now.</p>
          ) : null}
          {!isLoadingTerms && !termsError && termsMarkdown.trim().length > 0 && termsFormat !== "text/markdown" ? (
            <p className="games-section-copy">{termsMarkdown}</p>
          ) : null}
          {!isLoadingTerms && !termsError && termsMarkdown.trim().length > 0 && termsFormat === "text/markdown"
            ? parsedTerms.blocks.map((block, index) => {
                if (block.type === "heading1") {
                  return (
                    <p key={index} className="games-status-text" style={{ display: "none" }}>
                      {block.text}
                    </p>
                  );
                }
                if (block.type === "heading2") {
                  return (
                    <h4 key={index} className="games-section-title games-disclaimer-section-title">
                      {block.text}
                    </h4>
                  );
                }
                if (block.type === "list") {
                  return (
                    <ul key={index} className="games-disclaimer-list">
                      {block.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="games-section-copy">
                          {renderInlineSegments(item)}
                        </li>
                      ))}
                    </ul>
                  );
                }
                if (isAcknowledgmentParagraph(block)) {
                  return (
                    <div key={index} className="games-card games-disclaimer-highlight">
                      <p className="games-section-copy games-disclaimer-highlight-copy">
                        {renderInlineSegments(block.segments)}
                      </p>
                    </div>
                  );
                }
                return (
                  <p key={index} className="games-section-copy">
                    {renderInlineSegments(block.segments)}
                  </p>
                );
              })
            : null}
        </div>

        <div className="games-modal-actions">
          {allowAcknowledge ? (
            <button
              type="button"
              className="games-button games-button-primary"
              disabled={!canAcknowledge}
              onClick={() => void onAcknowledge?.()}
            >
              {isSubmittingAcknowledge
                ? "Submitting..."
                : canAcknowledge
                  ? "I Understand and Agree"
                  : "Please scroll to read"}
            </button>
          ) : null}
          {allowClose ? (
            <button
              type="button"
              className="games-button games-button-secondary"
              onClick={onClose}
            >
              Close
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
