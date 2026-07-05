"use client";

import { useEffect, useMemo, useState } from "react";
import { CLASS_OPTIONS, IMAGINE_CATEGORIES, LIMIT_BREAK_OPTIONS, SEA_WEAPON_OPTIONS, type ImagineCategory } from "@/lib/constants";

type Profile = {
  character_name: string | null;
  uid: string | null;
  class_name: string;
  power: number;
  dps_3min: number;
  sea_weapon_level: number | null;
  profile_updated_at: string;
};

type ImagineMaster = {
  id: number;
  category: ImagineCategory;
  name: string;
  sort_order: number;
  icon_url?: string | null;
};

type UserImagine = {
  imagine_id: number;
  limit_break: number;
};

type ProfileResponse = {
  discordUser: {
    id: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
  };
  profile: Profile | null;
  imagineMasters: ImagineMaster[];
  userImagines: UserImagine[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function ProfileEditor() {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [characterName, setCharacterName] = useState("");
  const [uid, setUid] = useState("");
  const [className, setClassName] = useState<(typeof CLASS_OPTIONS)[number]>("狼弓");
  const [power, setPower] = useState(0);
  const [dps3min, setDps3min] = useState(0);
  const [seaWeaponLevel, setSeaWeaponLevel] = useState("");
  const [limitBreaks, setLimitBreaks] = useState<Record<number, number>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const response = await fetch("/api/profile");
      const payload = (await response.json()) as ProfileResponse | { error: string };

      if (!response.ok) {
        setSaveState("error");
        setMessage("プロフィール取得に失敗しました");
        return;
      }

      const loaded = payload as ProfileResponse;
      setData(loaded);
      setCharacterName(loaded.profile?.character_name ?? "");
      setUid(loaded.profile?.uid ?? "");
      setClassName((loaded.profile?.class_name as (typeof CLASS_OPTIONS)[number]) ?? "狼弓");
      setPower(loaded.profile?.power ?? 0);
      setDps3min(loaded.profile?.dps_3min ?? 0);
      setSeaWeaponLevel(loaded.profile?.sea_weapon_level?.toString() ?? "");

      const owned = Object.fromEntries(loaded.userImagines.map((imagine) => [imagine.imagine_id, imagine.limit_break]));
      const defaults = Object.fromEntries(loaded.imagineMasters.map((imagine) => [imagine.id, owned[imagine.id] ?? -1]));
      setLimitBreaks(defaults);
    }

    void loadProfile();
  }, []);

  const groupedImagines = useMemo(() => {
    const groups: Record<ImagineCategory, ImagineMaster[]> = { S1: [], S2: [], S3: [], EVENT: [] };
    for (const imagine of data?.imagineMasters ?? []) {
      groups[imagine.category]?.push(imagine);
    }
    return groups;
  }, [data?.imagineMasters]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState("saving");
    setMessage("");

    const seaWeapon = seaWeaponLevel === "" ? null : Number(seaWeaponLevel);
    const imagines = (data?.imagineMasters ?? []).map((imagine) => ({
      imagineId: imagine.id,
      limitBreak: limitBreaks[imagine.id] ?? -1
    }));

    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterName, uid, className, power, dps3min, seaWeaponLevel: seaWeapon, imagines })
    });

    if (!response.ok) {
      setSaveState("error");
      setMessage("保存に失敗しました。入力内容を確認してください");
      return;
    }

    setSaveState("saved");
    setMessage("保存しました。最終更新日時を更新しました");
  }

  if (!data) {
    return (
      <main className="page-shell">
        <p className="loading">読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="page-shell profile-shell">
      <header className="profile-header">
        <div>
          <p className="eyebrow">BPSR Profile</p>
          <h1>プロフィール編集</h1>
        </div>
        <div className="discord-user">
          {data.discordUser.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" src={`https://cdn.discordapp.com/avatars/${data.discordUser.id}/${data.discordUser.avatar}.png?size=80`} />
          ) : null}
          <div>
            <span>{data.discordUser.globalName ?? data.discordUser.username}</span>
            <code>{data.discordUser.id}</code>
          </div>
        </div>
      </header>

      <form className="profile-form" onSubmit={saveProfile}>
        <section className="form-section">
          <h2>基本情報</h2>
          <div className="form-grid">
            <label>キャラクター名<input value={characterName} onChange={(event) => setCharacterName(event.target.value)} maxLength={80} /></label>
            <label>UID<input inputMode="numeric" maxLength={32} pattern="[0-9]*" value={uid} onChange={(event) => setUid(event.target.value.replace(/\D/g, ""))} /></label>
            <label>クラス<select value={className} onChange={(event) => setClassName(event.target.value as (typeof CLASS_OPTIONS)[number])}>{CLASS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
            <label>戦力<input min={0} value={power} onChange={(event) => setPower(Number(event.target.value))} type="number" /></label>
            <label>3分合計DPS<input min={0} value={dps3min} onChange={(event) => setDps3min(Number(event.target.value))} type="number" /></label>
            <label>海武器<select value={seaWeaponLevel} onChange={(event) => setSeaWeaponLevel(event.target.value)}>{SEA_WEAPON_OPTIONS.map((option) => <option key={option.value || "none"} value={option.value}>{option.label}</option>)}</select></label>
          </div>
        </section>

        {IMAGINE_CATEGORIES.map((category) => (
          <section className="form-section" key={category}>
            <h2>{category === "EVENT" ? "イベント" : category}</h2>
            <div className="imagine-grid">
              {groupedImagines[category].map((imagine) => (
                <label className="imagine-row" key={imagine.id}>
                  <span>{imagine.name}</span>
                  <select value={limitBreaks[imagine.id] ?? -1} onChange={(event) => setLimitBreaks((current) => ({ ...current, [imagine.id]: Number(event.target.value) }))}>
                    {LIMIT_BREAK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </section>
        ))}

        <footer className="save-bar">
          <p className={saveState === "error" ? "message error" : "message"}>{message}</p>
          <button className="button primary" disabled={saveState === "saving"} type="submit">
            {saveState === "saving" ? "保存中..." : "保存"}
          </button>
        </footer>
      </form>
    </main>
  );
}
