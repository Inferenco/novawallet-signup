import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AppQueryProvider } from "./providers/QueryProvider";
import { WalletProvider } from "./providers/WalletProvider";
import { ToastProvider } from "./providers/ToastProvider";

export function App() {
  return (
    <AppQueryProvider>
      <WalletProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </WalletProvider>
    </AppQueryProvider>
  );
}
