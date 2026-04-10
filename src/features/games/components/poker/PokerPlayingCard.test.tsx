import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PokerPlayingCard } from "./PokerPlayingCard";

describe("PokerPlayingCard", () => {
  it("renders red cards for hearts and diamonds", () => {
    render(<PokerPlayingCard value={26} size="board" />);

    expect(screen.getByRole("img", { name: "2 of Hearts" })).toHaveClass("color-red");
  });

  it("renders black cards for clubs and spades", () => {
    render(<PokerPlayingCard value={39} size="board" />);

    expect(screen.getByRole("img", { name: "2 of Spades" })).toHaveClass("color-black");
  });

  it("renders face-down state", () => {
    render(<PokerPlayingCard faceDown size="hero" />);

    expect(screen.getByRole("img", { name: "Face-down card" })).toHaveClass("face-down");
  });
});
