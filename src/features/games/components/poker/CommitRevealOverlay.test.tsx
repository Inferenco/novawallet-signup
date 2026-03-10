import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { CommitRevealOverlay } from "./CommitRevealOverlay";

describe("CommitRevealOverlay", () => {
  it("renders commit state and focuses the primary action", async () => {
    render(
      <CommitRevealOverlay
        visible
        phase="commit"
        secondsRemaining={37}
        status="idle"
        error={null}
        canCallTimeout={false}
        timeoutPending={false}
        onCommit={() => undefined}
        onReveal={() => undefined}
        onTimeout={() => undefined}
      />
    );

    const button = screen.getByRole("button", { name: "Request Cards" });
    expect(screen.getByRole("dialog", { name: "Request Cards" })).toBeInTheDocument();
    expect(screen.getByText("0:37")).toBeInTheDocument();
    await waitFor(() => expect(button).toHaveFocus());
  });

  it("renders reveal state copy", () => {
    render(
      <CommitRevealOverlay
        visible
        phase="reveal"
        secondsRemaining={12}
        status="idle"
        error={null}
        canCallTimeout={false}
        timeoutPending={false}
        onCommit={() => undefined}
        onReveal={() => undefined}
        onTimeout={() => undefined}
      />
    );

    expect(screen.getByRole("button", { name: "Accept Cards" })).toBeInTheDocument();
    expect(screen.getByText("Card Reveal")).toBeInTheDocument();
  });

  it("renders expired timeout state", () => {
    render(
      <CommitRevealOverlay
        visible
        phase="commit"
        secondsRemaining={0}
        status="idle"
        error={null}
        canCallTimeout
        timeoutPending={false}
        onCommit={() => undefined}
        onReveal={() => undefined}
        onTimeout={() => undefined}
      />
    );

    expect(screen.getByRole("button", { name: "Request Cards" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Force Timeout" })).toBeInTheDocument();
  });

  it("renders error copy when present", () => {
    render(
      <CommitRevealOverlay
        visible
        phase="reveal"
        secondsRemaining={15}
        status="error"
        error="Reveal failed"
        canCallTimeout={false}
        timeoutPending={false}
        onCommit={() => undefined}
        onReveal={() => undefined}
        onTimeout={() => undefined}
      />
    );

    expect(screen.getByText("Reveal failed")).toBeInTheDocument();
  });

  it("calls timeout when the timeout action is clicked", async () => {
    const user = userEvent.setup();
    const onTimeout = vi.fn();

    render(
      <CommitRevealOverlay
        visible
        phase="commit"
        secondsRemaining={0}
        status="idle"
        error={null}
        canCallTimeout
        timeoutPending={false}
        onCommit={() => undefined}
        onReveal={() => undefined}
        onTimeout={onTimeout}
      />
    );

    await user.click(screen.getByRole("button", { name: "Force Timeout" }));

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("traps focus and does not dismiss on escape", async () => {
    const user = userEvent.setup();

    render(
      <CommitRevealOverlay
        visible
        phase="commit"
        secondsRemaining={0}
        status="idle"
        error={null}
        canCallTimeout
        timeoutPending={false}
        onCommit={() => undefined}
        onReveal={() => undefined}
        onTimeout={() => undefined}
      />
    );

    const timeoutButton = screen.getByRole("button", { name: "Force Timeout" });
    await waitFor(() => expect(timeoutButton).toHaveFocus());
    await user.tab();
    expect(timeoutButton).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "Request Cards" })).toBeInTheDocument();
  });
});
