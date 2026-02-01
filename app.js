const e = React.createElement;

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
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(e(App));
