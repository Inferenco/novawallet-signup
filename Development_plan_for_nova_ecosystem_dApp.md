# Nova Ecosystem Browser dApp Development Plan

## 1. Objective and context

The Nova Wallet mobile app originally contained two sections: Events, where the community could propose events by submitting an event request to the on‑chain events.move contract, and Games, a suite of on‑chain poker games implemented in Move. To comply with the Play Store's T&Cs, the gaming features were removed in the newer nova‑wallet‑V2 repo, but the events contract (and its interface) remain unchanged. The goal of this project is to build a browser‑based dApp that:

1. Replicates the original Events feature: users can connect their wallet, submit a new event request (including paying the escrow fee), view their own pending or approved events, cancel submissions or live events, and view the list of public events.
2. Includes a Gaming section that currently serves as a "Coming soon" placeholder so that gaming features can be added later.
3. Aligns with the dark, cosmic aesthetic of the existing Nova Wallet website.

---

## 2. Understanding the existing contract and features

### 2.1 Event contract (Move)

The `wallet::events` module defines the core event types and functions. Key points:

- **Event structure:** an event has an ID, submitter address, title, description, category, image URL, event URL, start & end timestamps and a boolean `is_tba` (to indicate "to be announced"). There is also a `PendingEvent` that includes an escrow amount and submission timestamp.
- **Escrow requirements:** the module defines constants for the minimum escrow fee (1 CEDRA by default) and approval/rejection fee percentages. Event submission requires the `escrow_amount` to equal the current `min_escrow_fee`. If the event is approved, a percentage of the escrow is kept by the treasury and the remainder is refunded; on rejection or cancellation the relevant percentage is refunded.
- **Submission function:** users call `submit_event` with the escrow amount, title, description, category, image URL, event URL, start/end timestamps and `is_tba`. The function asserts that the escrow is positive and matches the module's minimum fee, deposits the escrow into the shared treasury, stores the pending event and emits an `EventSubmitted` event.
- **Cancellation and admin functions:** users can cancel their pending event (`cancel_pending_event`) or cancel a live event (`cancel_live_event`) to receive a refund. Administrators can approve or reject pending events, set escrow fees and fee percentages, and manage edit requests.
- **View functions:** the contract exposes view functions to fetch events or pending events in pages (`get_events_page`, `get_pending_events_page`), retrieve user‑specific events, or get configuration values like the minimum escrow fee. These functions will be used by the dApp to display data without generating transactions.

### 2.2 Existing mobile UI

The `MyEventsScreen` in the original repo shows how the mobile app interacts with the contract:

- It fetches events via a service that calls the `get_events_page` view and categorises them into live, upcoming and past using the current timestamp. Each card displays title, date range and the submitter.
- The event submission form includes fields for title, description, category (free text), image URL and optional link, plus date/time pickers. When submitting, the app builds a transaction to call `submit_event` with the escrow fee from `get_min_escrow_fee`, attaches the user's signature and waits for confirmation.
- Users can see a list of their own pending events and cancel them or submit edit requests, providing a user‑friendly front end for the contract functions.

### 2.3 Games removal

The nova‑wallet repository contains multiple game‑related modules under `contracts/games/` and a `games.ts` configuration file for poker. In the nova‑wallet‑V2 repository, these files are absent (searching for "games" returns only unrelated entries), confirming that the gaming features were removed. Our new dApp will therefore include a coming soon page for games but no functional gameplay.

---

## 3. High‑level architecture for the dApp

1. **Frontend framework:** build the dApp using React with TypeScript. Next.js is recommended for server‑side rendering and routing, which improves performance and SEO. The project will be structured as a typical React app (pages/components/hooks).

2. **Blockchain connection:** use the Aptos (or Cedra) ecosystem because the contracts are written in Move. The official `aptos-wallet-adapter` and aptos SDK can handle wallet connections, transaction building and signing. For Move networks not yet on Aptos (e.g., Cedra), adapt the connection by specifying the RPC endpoint and chain ID.

3. **Services layer:** create a thin abstraction layer to interact with the `wallet::events` contract. Implement functions (similar to those in `src/services/events/actions.ts`) to build and submit transactions (e.g., `submitEvent`, `cancelPendingEvent`, `cancelLiveEvent`, `submitEditRequest`) and read data using view functions (`getEventsPage`, `getUserEvents`, `getMinEscrowFee`). This separation makes the UI easier to maintain.

4. **State management:** use React hooks or a lightweight state library (e.g., Zustand) to manage user session, theme preference and event data.

5. **Theming:** define a dark cosmic theme matching the existing site. Use a global theme provider with variables for colours (e.g., Nova blue `#0f3a50` for backgrounds, bright accent `#00d4ff` for interactive elements) and surfaces. Derive additional colours using simple darken/lighten utilities similar to the `deriveThemeFromColor` function. The theme should support dark and light modes but default to dark.

6. **Routing:** implement pages: `/events` (list and submission), `/my-events` (user's events), `/games` (placeholder), `/` (landing page) and potentially `/admin` for internal management if needed later.

7. **Deployment:** host the dApp as a static site (e.g., via Vercel or Netlify) or containerise it for deployment on existing Nova infrastructure. Use environment variables to specify the contract address and RPC endpoints for different networks (devnet/testnet/mainnet). Configure CI/CD to automatically build and deploy on merges.

---

## 4. Functional requirements & UX design

### 4.1 Event submission

- **Wallet connection:** Provide a "Connect Wallet" button that uses the Aptos wallet adapter. Once connected, display the user's address and escrow fee.
- **Form fields:** Title (string), Description (multi‑line text), Category (string), Image URL (optional), Event URL (optional), Start date/time, End date/time and TBA toggle. Pre‑fill the escrow fee by calling `get_min_escrow_fee()`. If `is_tba` is true, hide the date/time pickers.
- **Validation:** Ensure the user enters required fields and that the end time is after the start time when not TBA (the contract checks this with `assert!(is_tba || end_timestamp > start_timestamp)`). Display the deposit amount in CEDRA and inform the user about refund rules.
- **Transaction building:** On submit, call a service function `submitEvent` that constructs a transaction calling `wallet::events::submit_event` with the parameters. The transaction must attach the escrow fee by transferring tokens; use the user's wallet to sign and submit. Wait for confirmation and show success/failure notifications.
- **User feedback:** After submission, redirect the user to their My Events page to see the pending event. Provide a transaction hash link for explorers.

### 4.2 Event listing and management

- **Public events page:** Use `get_events_page(limit, offset)` to display approved events in reverse chronological order (most recent first). For each event, show title, category, description snippet, image thumbnail, and computed status (Live when current time is between start and end; Upcoming when start time is in the future; Past when end time is in the past). Add pagination and category filters.
- **My Events page:** Fetch the user's pending and approved events via `get_user_pending_events` and `get_user_events`. Provide separate lists for Pending submissions and Live/Upcoming/Past events. For each pending event, include Cancel and Edit actions that call `cancel_pending_event` or `submit_edit_request` accordingly. For live events, offer a Cancel (self‑delete) button calling `cancel_live_event`. For editing, open a modal pre‑filled with event details and send a new edit request.
- **Admin dashboard (optional):** If you plan to moderate events via the dApp, implement an admin page using `get_admin_active_data` and the approval/rejection functions. Restrict access based on admin addresses defined in `wallet_treasury`.

### 4.3 Gaming placeholder

Create a `/games` route with the same navigation style as the other pages. Display a hero section and a brief explanation that the Nova gaming suite (e.g., poker) will return soon. Optionally include teaser artwork or a sign‑up form to be notified when the games go live. This page will later integrate with on‑chain poker modules like those defined in `games.ts` in the original repo.

### 4.4 Responsive & accessible design

- The dApp must work on desktop and mobile browsers. Use a responsive grid system and test layouts at common breakpoints (320 px, 768 px, 1024 px and 1440 px).
- Follow accessibility guidelines: high contrast for text and backgrounds, semantic HTML elements, ARIA attributes for form controls, and keyboard‑navigable interactions.

### 4.5 Internationalisation & time zones

The event contract stores timestamps in seconds since epoch (UTC). Convert these to the user's local time zone in the UI. Use `luxon` or similar library for date/time formatting. Provide clear date formats (e.g., "3 March 2026, 19:00 UTC+1").

---

## 5. Implementation steps (for an AI agent)

1. **Project setup**
   - Initialise a new Next.js project with TypeScript: `npx create-next-app nova-dapp --typescript`.
   - Install dependencies: `@aptos-labs/aptos-wallet-adapter` or `@aptos-labs/wallet-adapter-react`, `aptos`, `@emotion/react` (if using styled components), `@headlessui/react` (for modal/dialog), `luxon`, and a UI framework (e.g., Tailwind CSS or Chakra UI).
   - Configure Tailwind with a dark theme and custom colours matching Nova's palette.
   - Create `.env.local` with contract address (`VITE_EVENTS_CONTRACT=<0x...>`), RPC endpoint and chain ID.

2. **Wallet connection**
   - Set up the Aptos wallet provider in `_app.tsx`. Use `WalletProvider` from the wallet adapter and pass supported wallets (e.g., Petra, Martian). Implement a `useWallet` hook to access the connected address and sign transactions.

3. **Service layer**
   - Under `src/services/events.ts`, write functions:

4. `getMinEscrowFee()` – call the view function `get_min_escrow_fee` via the Aptos client's view API.

5. `fetchEventsPage(limit, offset)` – call `get_events_page` and map the result to front‑end models.

6. `fetchUserEvents(address, limit, offset)` – call `get_user_events` and `get_user_pending_events` for the given address.

7. `submitEvent(params)` – build a transaction using `aptos` to call `wallet::events::submit_event`. Attach `escrow_amount` tokens, sign and submit. Wrap in try/catch to surface errors to the UI.

8. `cancelPendingEvent(pendingId)` – call `cancel_pending_event`.

9. `cancelLiveEvent(eventId)` – call `cancel_live_event`.

10. `submitEditRequest(eventId, updates)` – call `submit_edit_request`.

11. Provide helper functions to convert between Move types and JavaScript types (e.g., `BigInt` for `u64`).

12. **UI components**
    - **Layout:** Build a top navigation bar with links to Events, My Events, and Games. Include wallet connect/disconnect button displaying the user's address.

13. **EventList:** Create a component to render a list of events with status badges (Live, Upcoming, Past) and card styling. Add pagination controls. Use images if provided, falling back to placeholder art.

14. **EventForm:** Build a modal or separate page for submitting events. Use date and time pickers; hide them when "TBA" is toggled. Show the escrow fee and a "Submit" button. After submission, display feedback and redirect.

15. **MyEvents:** Create sections for pending events and approved events. Each list item should include action buttons (Cancel, Edit). For edit, show an `EventForm` pre‑populated with the current data and send an edit request.

16. **GamingPlaceholder:** Implement a simple page under `/games` with Nova‑styled artwork and copywriting about upcoming poker games.

17. **Theming**
    - Define CSS variables or Tailwind config for colours: `--bg-primary: #0f3a50; --bg-secondary: #1a5070; --accent: #00d4ff; --text-primary: #ffffff; --text-secondary: #a0aec0`. Use gradients similar to the derived theme function in the poker module. Provide dark and light versions if necessary.
    - Apply a global `ThemeProvider` to allow toggling between dark and light modes based on user preference. Persist the preference in `localStorage`.

18. **Testing & quality assurance**
    - Write unit tests for the service layer using Jest to simulate view calls and transaction building.
    - Integrate end‑to‑end tests with Cypress or Playwright to automate user flows: connecting a wallet (use a wallet emulator), submitting an event, viewing it in My Events, cancelling it, and verifying that the contract state changes accordingly.
    - Use static analysis (ESLint, Prettier) and type checking to maintain code quality.

19. **Deployment**
    - Configure a CI pipeline (GitHub Actions) that runs tests, builds the Next.js app and deploys it to the chosen hosting provider. Use environment variables for the contract address and endpoints to deploy to testnet and mainnet.
    - Register the dApp domain (e.g., `nova-dapp.inferenco.com`) and configure DNS.

---

## Timeline (indicative)

| Week | Milestones |
|---|---|
| 1 | Project setup, environment configuration, wallet integration. Create service layer skeleton and set up theme tokens. |
| 2 | Implement event submission form and transaction logic. Build event listing pages and My Events management. |
| 3 | Implement edit and cancel features, pagination, and user feedback. Set up the gaming placeholder page. Apply responsive styling and theme integration. |
| 4 | Write unit and E2E tests. Perform usability testing and adjust UI/UX. Configure CI/CD and deploy to testnet. |
| 5 | Prepare mainnet deployment, finalize documentation and announcements. |

---

## 6. Conclusion

This plan details how to build a browser‑based Nova ecosystem dApp that faithfully replicates the original Events functionality and provides a foundation for future Gaming features. By leveraging the existing Move contracts and modern web technologies, users will be able to submit events, manage their submissions, and explore community happenings via the browser. The plan emphasises modular design, clear theming aligned with Nova's cosmic aesthetic, and readiness for future expansion into on‑chain games. Following these steps will allow an AI agent or development team to implement the dApp efficiently while preserving the original contract logic and user experience.

---

## Sources

- events.move — https://github.com/Inferenco/nova-wallet/blob/6be1f4f4f2624b3ae1520a270712970dd06e6591/contracts/wallet/sources/events.move
- events.ts — https://github.com/Inferenco/nova-wallet/blob/6be1f4f4f2624b3ae1520a270712970dd06e6591/src/services/events.ts
- actions.ts — https://github.com/Inferenco/nova-wallet/blob/6be1f4f4f2624b3ae1520a270712970dd06e6591/src/services/events/actions.ts
- my-events.tsx — https://github.com/Inferenco/nova-wallet/blob/6be1f4f4f2624b3ae1520a270712970dd06e6591/app/(auth)/my-events.tsx
- CHANGELOG.md — https://github.com/Inferenco/nova-wallet-V2/blob/83f818db56fefb7395d6570c6412de147c6c1b46/CHANGELOG.md
- theme.ts — https://github.com/Inferenco/nova-wallet/blob/6be1f4f4f2624b3ae1520a270712970dd06e6591/src/utils/theme.ts
