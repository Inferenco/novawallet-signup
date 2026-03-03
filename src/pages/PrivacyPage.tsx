import { GlassCard } from "@/components/ui";

export function PrivacyPage() {
  return (
    <GlassCard as="section" className="mx-auto grid max-w-3xl gap-nova-lg">
      <h1 className="text-h1 text-text-primary">Privacy Policy for Nova Wallet</h1>
      <p className="text-caption text-text-muted">
        <strong>Effective Date:</strong> February 23, 2026
      </p>

      <p className="text-body text-text-secondary">
        This Privacy Policy describes how Nova Wallet ("we", "our", or "us")
        collects, uses, and shares information in connection with your use of
        our mobile application (the "App").
      </p>

      <h2 className="text-h2 text-text-primary">1. Information We Collect</h2>
      <h3 className="text-h3 text-text-secondary">Camera Permission</h3>
      <p className="text-body text-text-secondary">
        Our App requires access to your device&apos;s camera (
        <code>android.permission.CAMERA</code>).
      </p>
      <p className="text-body text-text-secondary">
        <strong>Why we need this:</strong> The camera is strictly used as a
        scanner to capture and decode QR codes within the App to facilitate
        cryptocurrency sending and wallet importing.
      </p>
      <p className="text-body text-text-secondary">
        <strong>What happens to your data:</strong>
      </p>
      <ul className="list-disc space-y-nova-sm pl-nova-xl text-body text-text-secondary">
        <li>The image processing happens entirely locally on your device.</li>
        <li>
          We do not record video, take photos for storage, or transmit any image
          data to our servers or any third-party services.
        </li>
        <li>
          Once the QR code is scanned and the text data (such as a public wallet
          address) is extracted, the camera feed is immediately discarded.
        </li>
      </ul>

      <h3 className="text-h3 text-text-secondary">Other Information</h3>
      <p className="text-body text-text-secondary">
        Nova Wallet is a self-custodial wallet. We do not collect, store, or
        have access to your private keys, passwords, or the funds associated
        with your account. All sensitive cryptographic information is stored
        securely on your local device.
      </p>

      <h2 className="text-h2 text-text-primary">2. Third-Party Services</h2>
      <p className="text-body text-text-secondary">
        The App may contain links to third-party websites or services. We are
        not responsible for the privacy practices of these third parties.
      </p>

      <h2 className="text-h2 text-text-primary">3. Changes to This Policy</h2>
      <p className="text-body text-text-secondary">
        We may update this Privacy Policy from time to time. We will notify you
        of any changes by posting the new Privacy Policy on this page.
      </p>

      <h2 className="text-h2 text-text-primary">4. Contact Us</h2>
      <p className="text-body text-text-secondary">
        If you have any questions about this Privacy Policy, please contact us
        at
        <a
          href="mailto:singularityshiftai@gmail.com"
          className="ml-1 text-nova-cyan hover:underline"
        >
          singularityshiftai@gmail.com
        </a>
        .
      </p>
    </GlassCard>
  );
}
