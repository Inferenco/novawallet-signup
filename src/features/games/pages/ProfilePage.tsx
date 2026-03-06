import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useToast } from "@/providers/ToastProvider";
import { useWallet } from "@/providers/WalletProvider";
import { GamesTopBar } from "../components/GamesTopBar";
import { PROFILE_AVATAR_URL_MAX, PROFILE_NICKNAME_MAX, PROFILE_PRESET_AVATARS } from "../config/profile";
import { useGamesNetwork } from "../hooks/useGamesNetwork";
import { useGameSigner } from "../hooks/useGameSigner";
import { getProfile } from "../services/profiles";
import { clearProfile, setProfile } from "../services/profiles/actions";
import { canUploadProfileImages, uploadProfileImage } from "../services/storage";
import "../styles/profile.css";

export function ProfilePage() {
  const wallet = useWallet();
  const signer = useGameSigner();
  const network = useGamesNetwork();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const address = wallet.account?.address?.toString() ?? "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    let alive = true;

    const loadProfile = async () => {
      if (!wallet.connected || !address) {
        if (alive) {
          setNickname("");
          setAvatarUrl("");
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const profile = await getProfile(network, address);
        if (!alive) return;
        setNickname(profile?.nickname ?? "");
        setAvatarUrl(profile?.avatarUrl ?? "");
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();
    return () => {
      alive = false;
    };
  }, [address, network, wallet.connected]);

  const canUpload = useMemo(() => canUploadProfileImages(), []);

  const handleSave = async () => {
    if (!wallet.connected || !signer) {
      pushToast("error", "Connect your wallet before saving your profile.");
      return;
    }
    if (wallet.networkMismatch) {
      pushToast("error", "Switch wallet network to Cedra Testnet.");
      return;
    }
    if (nickname.trim().length === 0 || nickname.trim().length > PROFILE_NICKNAME_MAX) {
      pushToast("error", `Nickname must be between 1 and ${PROFILE_NICKNAME_MAX} characters.`);
      return;
    }
    if (avatarUrl.length > PROFILE_AVATAR_URL_MAX) {
      pushToast("error", `Avatar URL must be ${PROFILE_AVATAR_URL_MAX} characters or fewer.`);
      return;
    }

    setIsSaving(true);
    try {
      const result = await setProfile(network, signer, nickname.trim(), avatarUrl.trim());
      if (result.success) {
        pushToast("success", "Profile updated.");
        navigate("/games");
      } else {
        pushToast("error", "Profile transaction failed.");
      }
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!wallet.connected || !signer) {
      pushToast("error", "Connect your wallet before clearing your profile.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await clearProfile(network, signer);
      if (result.success) {
        setNickname("");
        setAvatarUrl("");
        pushToast("success", "Profile cleared.");
      } else {
        pushToast("error", "Clear profile transaction failed.");
      }
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Failed to clear profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !address) return;

    setIsUploading(true);
    try {
      const nextUrl = await uploadProfileImage(file, address);
      setAvatarUrl(nextUrl);
      pushToast("success", "Avatar uploaded.");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  if (isLoading) {
    return (
      <section className="games-screen">
        <GamesTopBar title="Player Profile" backTo="/games" rightSlot={<WalletButton />} />
        <div className="games-loading-screen">
          <div className="games-spinner" />
        </div>
      </section>
    );
  }

  if (!wallet.connected) {
    return (
      <section className="games-screen">
        <GamesTopBar title="Player Profile" backTo="/games" rightSlot={<WalletButton />} />
        <div className="games-screen-content">
          <div className="games-empty-state">
            Connect your wallet to create or edit your gaming profile.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="games-screen">
      <GamesTopBar title="Player Profile" backTo="/games" rightSlot={<WalletButton />} />

      <div className="games-screen-scroll">
        <div className="games-screen-content">
          <div className="games-card games-card-body games-profile-hero">
            <div className="games-profile-avatar-row">
              <div className="games-profile-avatar-large">
                {avatarUrl ? <img src={avatarUrl} alt="Profile avatar" /> : <span>◎</span>}
              </div>
              <div className="games-profile-avatar-actions">
                <p className="games-section-title">Your Avatar</p>
                <p className="games-section-copy">
                  Choose a preset, paste a URL, or upload an image when storage is configured.
                </p>
              </div>
            </div>
          </div>

          <div className="games-card games-card-body games-profile-form">
            <label className="games-field">
              <span className="games-field-label">Nickname</span>
              <input
                className="games-input"
                maxLength={PROFILE_NICKNAME_MAX}
                placeholder="Big Daddy Dev"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
            </label>
            <p className="games-status-text">{nickname.length}/{PROFILE_NICKNAME_MAX}</p>

            <label className="games-field">
              <span className="games-field-label">Avatar URL</span>
              <input
                className="games-input"
                maxLength={PROFILE_AVATAR_URL_MAX}
                placeholder="https://example.com/avatar.png"
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
              />
            </label>
            <p className="games-status-text">{avatarUrl.length}/{PROFILE_AVATAR_URL_MAX}</p>
          </div>

          <div className="games-card games-card-body games-section">
            <h2 className="games-section-title">Preset Avatars</h2>
            <div className="games-profile-preset-grid">
              {PROFILE_PRESET_AVATARS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`games-profile-preset ${avatarUrl === preset ? "active" : ""}`}
                  onClick={() => setAvatarUrl(preset)}
                >
                  <img src={preset} alt="Preset avatar" />
                </button>
              ))}
            </div>
          </div>

          <div className="games-card games-card-body games-section">
            <h2 className="games-section-title">Extra Sources</h2>
            {canUpload ? (
              <>
                <button
                  type="button"
                  className="games-button games-button-secondary"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? "Uploading..." : "Upload Avatar"}
                </button>
                <input
                  ref={fileInputRef}
                  hidden
                  accept="image/*"
                  type="file"
                  onChange={handleFileChange}
                />
              </>
            ) : (
              <p className="games-profile-disabled-note">
                Avatar uploads are disabled until `VITE_SUPABASE_URL` and
                `VITE_SUPABASE_ANON_KEY` are configured.
              </p>
            )}
            <p className="games-profile-disabled-note">
              NFT avatar selection is reserved for a later pass because this web app does not yet
              expose wallet NFT inventory.
            </p>
          </div>

          <div className="games-profile-actions">
            <button
              type="button"
              className="games-button games-button-primary"
              disabled={isSaving || isUploading}
              onClick={() => void handleSave()}
            >
              {isSaving ? "Saving..." : "Save Profile"}
            </button>
            <button
              type="button"
              className="games-button games-button-danger"
              disabled={isSaving}
              onClick={() => void handleClear()}
            >
              Clear Profile
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
