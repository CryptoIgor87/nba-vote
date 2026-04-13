"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { User, Save, Camera } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileData, setProfileData] = useState<{
    display_name: string | null;
    avatar_url: string | null;
    role: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        setDisplayName(data.display_name || data.name || "");
      }
    }
    load();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const formData = new FormData();
    formData.append("display_name", displayName);
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    const res = await fetch("/api/profile", {
      method: "PUT",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setProfileData(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const currentAvatar =
    avatarPreview ||
    profileData?.avatar_url ||
    session?.user?.image ||
    null;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Профиль</h1>

      <div className="bg-card border border-border rounded-xl p-6">
        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <label className="relative cursor-pointer group">
            <div className="w-24 h-24 rounded-full bg-background border-2 border-border overflow-hidden">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={32} className="text-muted" />
                </div>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <Camera size={20} className="text-white" />
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-xs text-muted mb-1">Email</label>
          <p className="text-sm text-foreground/60">{session?.user?.email}</p>
        </div>

        {/* Display name */}
        <div className="mb-4">
          <label className="block text-xs text-muted mb-1">
            Отображаемое имя
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
            placeholder="Ваше имя"
          />
        </div>

        {/* Role badge */}
        {profileData?.role === "ADMIN" && (
          <div className="mb-4">
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-accent/15 text-accent text-xs font-medium">
              Администратор
            </span>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save size={16} />
          {saved ? "Сохранено!" : saving ? "Сохраняю..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
