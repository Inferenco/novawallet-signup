import { Link, useParams } from "react-router-dom";
import { useWallet } from "@/providers/WalletProvider";
import { useGamesNetwork } from "../hooks/useGamesNetwork";
import { ChatProvider } from "../context/chat";
import { PokerGameplayController } from "../components/poker/PokerGameplayController";

export function PokerGameplayPage() {
  const { tableAddress } = useParams<{ tableAddress: string }>();
  const wallet = useWallet();
  const network = useGamesNetwork();
  const walletAddress = wallet.account?.address?.toString() ?? null;
  const tableId = tableAddress ? `${network}:${tableAddress}` : null;

  if (!tableAddress) {
    return (
      <div className="games-gameplay-shell games-gameplay-shell-wallet">
        <div className="games-gameplay-wrap games-gameplay-wrap-wallet">
          <p>Missing table address.</p>
          <Link className="nova-btn nova-btn-ghost" to="/games/poker">
            Back to lobby
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ChatProvider tableId={tableId} walletAddress={walletAddress} network={network}>
      <PokerGameplayController tableAddress={tableAddress} />
    </ChatProvider>
  );
}
