"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Headphones, Info, Send } from "lucide-react";

type ContentMaster = { id: number; category: string; name: string };
type ModeMaster = { id: number; content_id: number; name: string };
type ClassMaster = { id: number; name: string; role_key: "DPS" | "TANK" | "HEALER" | "MULTI" };

type RecruitmentCreateFormProps = {
  contents: ContentMaster[];
  modes: ModeMaster[];
  classes: ClassMaster[];
};

const fallbackContents: ContentMaster[] = [
  { id: 1, category: "ダンジョン", name: "衰亡の深淵" },
  { id: 2, category: "ダンジョン", name: "ロックスネークの巣" },
  { id: 3, category: "レイド", name: "幻花の残骸" }
];

const fallbackModes: ModeMaster[] = [
  { id: 1, content_id: 1, name: "装備周回" },
  { id: 2, content_id: 1, name: "スコアアタック" },
  { id: 3, content_id: 2, name: "装備周回" },
  { id: 4, content_id: 3, name: "ハード" }
];

const fallbackClasses: ClassMaster[] = [
  { id: 1, name: "狼弓", role_key: "DPS" },
  { id: 2, name: "鷹弓", role_key: "DPS" },
  { id: 3, name: "光盾", role_key: "TANK" },
  { id: 4, name: "森癒", role_key: "HEALER" },
  { id: 5, name: "狂音", role_key: "MULTI" }
];

export function RecruitmentCreateForm({ contents, modes, classes }: RecruitmentCreateFormProps) {
  const router = useRouter();
  const contentOptions = contents.length ? contents : fallbackContents;
  const modeOptions = modes.length ? modes : fallbackModes;
  const classOptions = classes.length ? classes : fallbackClasses;
  const [contentId, setContentId] = useState(contentOptions[0]?.id ?? 1);
  const [modeId, setModeId] = useState(0);
  const [title, setTitle] = useState("");
  const [conditions, setConditions] = useState("");
  const [vcMode, setVcMode] = useState<"なし" | "あり" | "あり（プライベート）">("なし");
  const [dps, setDps] = useState(3);
  const [tank, setTank] = useState(1);
  const [healer, setHealer] = useState(1);
  const [requiredClassText, setRequiredClassText] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filteredModes = useMemo(() => modeOptions.filter((mode) => mode.content_id === contentId), [contentId, modeOptions]);
  const selectedModeId = modeId || filteredModes[0]?.id || 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 4) {
      setMessage("タイトルは4文字以上で入力してください");
      return;
    }

    if (!selectedModeId) {
      setMessage("コンテンツとモードを選択してください");
      return;
    }

    if (dps + tank + healer <= 0) {
      setMessage("募集人数を1人以上にしてください");
      return;
    }

    setIsSaving(true);
    setMessage("保存中...");

    const classNames = requiredClassText
      .split(/[、,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      contentId,
      modeId: selectedModeId,
      title: trimmedTitle,
      conditions,
      vcMode,
      roleSlots: {
        DPS: { required: dps, accepted: 0 },
        TANK: { required: tank, accepted: 0 },
        HEALER: { required: healer, accepted: 0 }
      },
      requiredClasses: {
        DPS: classNames,
        TANK: [],
        HEALER: []
      }
    };

    try {
      const response = await fetch("/api/recruitments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "保存できませんでした");
        setIsSaving(false);
        return;
      }

      router.push(`/recruitments/${result.recruitmentId}`);
      router.refresh();
    } catch {
      setMessage("通信エラーで保存できませんでした");
      setIsSaving(false);
    }
  }

  return (
    <section className="create-layout single-column">
      <form className="create-form" onSubmit={handleSubmit}>
        <section className="form-section portal-form-section">
          <div className="panel-title-row">
            <Info size={18} aria-hidden="true" />
            <h2>基本情報</h2>
          </div>
          <div className="form-grid">
            <label>
              コンテンツ
              <select value={contentId} onChange={(event) => { setContentId(Number(event.target.value)); setModeId(0); }}>
                {contentOptions.map((content) => (
                  <option value={content.id} key={content.id}>{content.category} / {content.name}</option>
                ))}
              </select>
            </label>
            <label>
              モード
              <select value={selectedModeId} onChange={(event) => setModeId(Number(event.target.value))}>
                {filteredModes.map((mode) => <option value={mode.id} key={mode.id}>{mode.name}</option>)}
              </select>
            </label>
            <label className="span-2">
              タイトル
              <input value={title} onChange={(event) => setTitle(event.target.value)} minLength={4} placeholder="例: 衰亡の深淵 装備周回 5周予定" />
            </label>
            <label className="span-2">
              条件
              <textarea value={conditions} onChange={(event) => setConditions(event.target.value)} placeholder="例: 戦力110,000以上。初見可、安定重視。" />
            </label>
          </div>
        </section>

        <section className="form-section portal-form-section">
          <div className="panel-title-row">
            <Headphones size={18} aria-hidden="true" />
            <h2>VCと募集人数</h2>
          </div>
          <div className="form-grid three">
            <label>
              VC
              <select value={vcMode} onChange={(event) => setVcMode(event.target.value as typeof vcMode)}>
                <option>なし</option>
                <option>あり</option>
                <option>あり（プライベート）</option>
              </select>
            </label>
            <label>
              DPS
              <input type="number" min="0" value={dps} onChange={(event) => setDps(Number(event.target.value))} />
            </label>
            <label>
              タンク
              <input type="number" min="0" value={tank} onChange={(event) => setTank(Number(event.target.value))} />
            </label>
            <label>
              ヒーラー
              <input type="number" min="0" value={healer} onChange={(event) => setHealer(Number(event.target.value))} />
            </label>
            <label className="span-2">
              必要クラス
              <input
                value={requiredClassText}
                onChange={(event) => setRequiredClassText(event.target.value)}
                placeholder={`例: ${classOptions.slice(0, 4).map((item) => item.name).join(", ")}`}
              />
            </label>
          </div>
        </section>

        <div className="save-bar portal-save-bar action-only">
          {message ? <p className="message">{message}</p> : null}
          <button className="button primary" type="submit" disabled={isSaving}>
            <Send size={17} aria-hidden="true" />
            募集開始
          </button>
        </div>
      </form>

    </section>
  );
}