const e = React.createElement;

function Footer() {
  return e(
    "footer",
    { className: "page-footer" },
    e(
      "div",
      { className: "social-links" },
      e(
        "a",
        {
          href: "https://x.com/movenovawallet",
          target: "_blank",
          rel: "noopener noreferrer",
          className: "social-icon",
          "aria-label": "X (formerly Twitter)",
        },
        e(
          "svg",
          {
            viewBox: "0 0 24 24",
            fill: "currentColor",
            className: "icon-x",
          },
          e("path", {
            d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
          })
        )
      ),
      e(
        "a",
        {
          href: "https://t.me/movenovawallet",
          target: "_blank",
          rel: "noopener noreferrer",
          className: "social-icon",
          "aria-label": "Telegram",
        },
        e(
          "svg",
          {
            viewBox: "0 0 24 24",
            fill: "currentColor",
            className: "icon-telegram",
          },
          e("path", {
            d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z",
          })
        )
      )
    ),
    e(
      "div",
      { style: { display: "flex", justifyContent: "center", marginTop: "24px", fontSize: "0.85rem" } },
      e(
        "a",
        {
          href: "/privacy.html",
          style: { color: "var(--ink-2)", textDecoration: "none", transition: "color 0.2s ease" },
          onMouseOver: (e) => (e.target.style.color = "var(--ink-0)"),
          onMouseOut: (e) => (e.target.style.color = "var(--ink-2)"),
        },
        "Privacy Policy"
      )
    )
  );
}

function App() {
  return e(
    "main",
    { className: "page" },
    e(
      "section",
      { className: "frame" },
      e(
        "div",
        null,
        e(
          "div",
          { className: "brand" },
          e(
            "div",
            { className: "logo-wrap" },
            e("img", {
              className: "logo",
              src: "nova-logo.png",
              alt: "Nova Wallet logo",
            })
          ),
          e(
            "div",
            { className: "brand-text" },
            e(
              "h1",
              { className: "title" },
              "Nova ",
              e("span", null, "Wallet")
            ),
            e(
              "div",
              { className: "tagline" },
              "Join the ",
              e("span", null, "Play Store"),
              " beta"
            )
          )
        ),
        e(
          "p",
          { className: "copy" },
          "We are opening the official Nova Wallet Android beta for early access. ",
          e("strong", null, "First-come, first-served"),
          " from qualifying applicants, with a cap of ",
          e("strong", null, "100 testers"),
          "."
        ),
        e(
          "p",
          { className: "copy" },
          "Nova Wallet is a non-custodial, full-featured wallet built for the Move language on Cedra. Manage assets, explore dApps, and play integrated on-chain poker with more single and multiplayer games coming soon. ",
          e("strong", null, "Gambling is simulated and free to play"),
          "."
        ),
        e(
          "p",
          { className: "copy" },
          "If you love testing new wallet experiences and can provide concise feedback, apply now!"
        )
      ),
      e(
        "div",
        { className: "panel" },
        e("h2", null, "Beta Access"),
        e(
          "div",
          { className: "detail" },
          "Once approved, you will receive Google Play Store instructions to install the beta build and a direct line for feedback."
        ),
        e(
          "div",
          { className: "stats" },
          e("div", null, e("span", null, "100"), " total tester slots"),
          e("div", null, e("span", null, "FCFS"), " for qualifying applicants"),
          e("div", null, e("span", null, "Play Store"), " distribution only")
        ),
        e(
          "div",
          { className: "cta-wrap" },
          e(
            "a",
            {
              className: "cta",
              href: "https://forms.gle/pSCzwfYcE34DBofd8",
              target: "_blank",
              rel: "noopener noreferrer",
            },
            "Apply for Beta Access"
          )
        ),
        e(
          "div",
          { className: "footer" },
          "We will review applications in the order received and notify accepted testers by email."
        )
      )
    ),
    e(Footer)
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(e(App));
