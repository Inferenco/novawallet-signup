import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShowdownModal } from "./ShowdownModal";

describe("ShowdownModal", () => {
  it("renders board cards and showdown player hole cards", () => {
    render(
      <ShowdownModal
        visible
        handNumber={3}
        resultType="showdown"
        totalPot={50}
        communityCards={[1, 22, 47]}
        winners={[
          {
            address: "0xabc",
            amount: 50,
            holeCards: [11, 12],
            handType: 0,
            seatIndex: 0
          }
        ]}
        showdownPlayers={[
          {
            address: "0xabc",
            seatIndex: 0,
            holeCards: [11, 12],
            handType: 0
          }
        ]}
        playerProfiles={new Map([["0xabc", { nickname: "Daddy Dev", avatarUrl: "", updatedAt: 0 }]])}
        onClose={() => undefined}
      />
    );

    expect(screen.getByRole("img", { name: "3 of Clubs" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "K of Clubs" })).toBeInTheDocument();
    expect(screen.getByText("Showdown Players")).toBeInTheDocument();
  });

  it("omits showdown players in fold-win mode", () => {
    render(
      <ShowdownModal
        visible
        handNumber={3}
        resultType="fold_win"
        totalPot={50}
        communityCards={[1, 22, 47]}
        winners={[
          {
            address: "0xabc",
            amount: 50,
            holeCards: [],
            handType: 0,
            seatIndex: 0
          }
        ]}
        showdownPlayers={[]}
        playerProfiles={new Map([["0xabc", { nickname: "Daddy Dev", avatarUrl: "", updatedAt: 0 }]])}
        onClose={() => undefined}
      />
    );

    expect(screen.queryByText("Showdown Players")).not.toBeInTheDocument();
  });

  it("renders revealed folded hands when provided", () => {
    render(
      <ShowdownModal
        visible
        status="ready"
        handNumber={4}
        resultType="showdown"
        totalPot={80}
        communityCards={[1, 22, 47, 9, 11]}
        winners={[
          {
            address: "0xabc",
            amount: 80,
            holeCards: [11, 12],
            handType: 0,
            seatIndex: 0
          }
        ]}
        showdownPlayers={[]}
        revealedCards={[{ seatIdx: 1, player: "0xdef", holeCards: [2, 18] }]}
        playerProfiles={
          new Map([
            ["0xabc", { nickname: "Daddy Dev", avatarUrl: "", updatedAt: 0 }],
            ["0xdef", { nickname: "Folded Villain", avatarUrl: "", updatedAt: 0 }]
          ])
        }
        onClose={() => undefined}
      />
    );

    expect(screen.getByText("Revealed Folded Hands")).toBeInTheDocument();
    expect(screen.getByText("Folded Villain")).toBeInTheDocument();
  });
});
