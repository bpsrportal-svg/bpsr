"use client";

import { useMemo, useState } from "react";
import { BookOpen, Database, ImageIcon, ListChecks, Plus, RefreshCcw, Save, Sparkles, ToggleLeft, UsersRound } from "lucide-react";
import { masterResourceDescriptions, masterResourceLabels, masterResources, type MasterResource } from "@/lib/admin-masters";
import { getRoleLabel, IMAGINE_CATEGORIES, roleKeys } from "@/lib/constants";

type MasterRow = Record<string, string | number | boolean | null | undefined>;

type AdminMasterConsoleProps = {
  initialRows: Record<MasterResource, MasterRow[]>;
};

const T = {
  menu: "\u7ba1\u7406\u30e1\u30cb\u30e5\u30fc",
  console: "\u30de\u30b9\u30bf\u30fc\u7ba1\u7406",
  add: "\u8ffd\u52a0",
  edit: "\u7de8\u96c6",
  disable: "\u7121\u52b9\u5316",
  enabled: "\u6709\u52b9",
  disabled: "\u7121\u52b9",
  activeCount: "\u6709\u52b9",
  save: "\u4fdd\u5b58",
  saving: "\u4fdd\u5b58\u4e2d...",
  saved: "\u4fdd\u5b58\u3057\u307e\u3057\u305f",
  disableDone: "\u7121\u52b9\u5316\u3057\u307e\u3057\u305f",
  saveFailed: "\u4fdd\u5b58\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f",
  disableFailed: "\u7121\u52b9\u5316\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f",
  create: "\u65b0\u898f\u8ffd\u52a0",
  cancel: "\u30ad\u30e3\u30f3\u30bb\u30eb",
  help: "\u5fc5\u8981\u306a\u9805\u76ee\u3060\u3051\u76f4\u3057\u3066\u4fdd\u5b58\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  close: "\u7de8\u96c6\u3092\u9589\u3058\u308b",
  category: "\u30ab\u30c6\u30b4\u30ea",
  name: "\u540d\u524d",
  imagineName: "\u30a4\u30de\u30b8\u30f3\u540d",
  contentCategory: "\u5206\u985e",
  contentName: "\u30b3\u30f3\u30c6\u30f3\u30c4\u540d",
  description: "\u8aac\u660e",
  iconUrl: "\u30a2\u30a4\u30b3\u30f3URL",
  sort: "\u4e26\u3073\u9806",
  status: "\u72b6\u614b",
  action: "\u64cd\u4f5c",
  mode: "\u30e2\u30fc\u30c9",
  content: "\u30b3\u30f3\u30c6\u30f3\u30c4",
  targetContent: "\u5bfe\u8c61\u30b3\u30f3\u30c6\u30f3\u30c4",
  modeName: "\u30e2\u30fc\u30c9\u540d",
  className: "\u30af\u30e9\u30b9\u540d",
  role: "\u30ed\u30fc\u30eb",
  key: "\u30ad\u30fc",
  label: "\u8868\u793a\u540d",
  iconYes: "\u30a2\u30a4\u30b3\u30f3\u3042\u308a",
  unset: "\u672a\u8a2d\u5b9a"
};

const resourceIcons = {
  imagines: Sparkles,
  contents: Database,
  modes: BookOpen,
  classes: ListChecks,
  roles: UsersRound
} satisfies Record<MasterResource, typeof Sparkles>;

export function AdminMasterConsole({ initialRows }: AdminMasterConsoleProps) {
  const [active, setActive] = useState<MasterResource>("imagines");
  const [rows, setRows] = useState(initialRows);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [draft, setDraft] = useState<MasterRow>({});
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const activeRows = useMemo(() => rows[active] ?? [], [active, rows]);
  const activeOnlyCount = activeRows.filter((row) => row.is_active !== false).length;
  const sortedRows = useMemo(() => [...activeRows].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)), [activeRows]);

  function startCreate() {
    setEditingId("new");
    setDraft(getDefaultDraft(active, rows.contents));
    setMessage("");
  }

  function startEdit(row: MasterRow) {
    const id = getRowId(active, row);
    setEditingId(typeof id === "string" || typeof id === "number" ? id : null);
    setDraft({ ...row });
    setMessage("");
  }

  function updateDraft(key: string, value: string | number | boolean | null) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveDraft() {
    setIsSaving(true);
    setMessage("");
    const isNew = editingId === "new";
    const response = await fetch(`/api/admin/masters/${active}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isNew ? draft : { ...draft, id: editingId, key: editingId })
    });
    const result = await response.json();
    setIsSaving(false);
    if (!response.ok) {
      setMessage(result.error ?? T.saveFailed);
      return;
    }
    const row = result.row as MasterRow;
    setRows((current) => ({
      ...current,
      [active]: isNew ? [...current[active], row] : current[active].map((item) => (String(getRowId(active, item)) === String(getRowId(active, row)) ? row : item))
    }));
    setEditingId(null);
    setDraft({});
    setMessage(T.saved);
  }

  async function disableRow(row: MasterRow) {
    const id = getRowId(active, row);
    setIsSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/masters/${active}?id=${encodeURIComponent(String(id))}`, { method: "DELETE" });
    const result = await response.json();
    setIsSaving(false);
    if (!response.ok) {
      setMessage(result.error ?? T.disableFailed);
      return;
    }
    const updated = result.row as MasterRow;
    setRows((current) => ({
      ...current,
      [active]: current[active].map((item) => (String(getRowId(active, item)) === String(id) ? updated : item))
    }));
    setMessage(T.disableDone);
  }

  return (
    <section className="master-console" aria-label={T.console}>
      <div className="master-sidebar" role="tablist" aria-label={T.menu}>
        {masterResources.map((resource) => {
          const Icon = resourceIcons[resource];
          const isActive = active === resource;
          return (
            <button aria-selected={isActive} className={isActive ? "master-tab active" : "master-tab"} key={resource} onClick={() => { setActive(resource); setEditingId(null); setDraft({}); setMessage(""); }} role="tab" type="button">
              <Icon size={18} aria-hidden="true" />
              <span>{masterResourceLabels[resource]}</span>
              <strong>{rows[resource]?.filter((row) => row.is_active !== false).length ?? 0}</strong>
            </button>
          );
        })}
      </div>

      <div className="master-workspace">
        <header className="master-toolbar">
          <div>
            <p className="eyebrow">Master Console</p>
            <h2>{masterResourceLabels[active]}</h2>
            <p>{masterResourceDescriptions[active]}</p>
          </div>
          <div className="master-toolbar-actions">
            <span className="status-pill open">{T.activeCount} {activeOnlyCount}</span>
            <button className="button primary" onClick={startCreate} type="button"><Plus size={17} aria-hidden="true" />{T.add}</button>
          </div>
        </header>

        {editingId !== null ? <MasterEditor draft={draft} isNew={editingId === "new"} onCancel={() => { setEditingId(null); setDraft({}); }} onChange={updateDraft} onSave={saveDraft} resource={active} rows={rows} saving={isSaving} /> : null}
        {message ? <p className={message === T.saveFailed || message === T.disableFailed ? "message error" : "message"}>{message}</p> : null}

        <div className="master-table-wrap">
          <table className="admin-table master-table">
            <thead>{renderHeader(active)}</thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr className={row.is_active === false ? "inactive-row" : undefined} key={String(getRowId(active, row))}>
                  {renderCells(active, row, rows.contents)}
                  <td><div className="row-actions"><button className="button secondary small" onClick={() => startEdit(row)} type="button">{T.edit}</button><button className="button secondary small" disabled={row.is_active === false || isSaving} onClick={() => disableRow(row)} type="button">{T.disable}</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="master-card-list">
            {sortedRows.map((row) => (
              <article className={row.is_active === false ? "master-card inactive-row" : "master-card"} key={String(getRowId(active, row))}>
                <div><strong>{getPrimaryLabel(active, row)}</strong><span>{getSecondaryLabel(active, row, rows.contents)}</span></div>
                <div className="row-actions"><button className="button secondary small" onClick={() => startEdit(row)} type="button">{T.edit}</button><button className="button secondary small" disabled={row.is_active === false || isSaving} onClick={() => disableRow(row)} type="button">{T.disable}</button></div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

type MasterEditorProps = {
  draft: MasterRow;
  isNew: boolean;
  onCancel: () => void;
  onChange: (key: string, value: string | number | boolean | null) => void;
  onSave: () => void;
  resource: MasterResource;
  rows: Record<MasterResource, MasterRow[]>;
  saving: boolean;
};

function MasterEditor({ draft, isNew, onCancel, onChange, onSave, resource, rows, saving }: MasterEditorProps) {
  return (
    <div className="master-editor">
      <div className="panel-title-row"><div><h3>{isNew ? T.create : T.edit}</h3><p>{T.help}</p></div><button className="icon-button" onClick={onCancel} type="button" aria-label={T.close}><RefreshCcw size={17} aria-hidden="true" /></button></div>
      <div className="master-form-grid">{renderEditorFields(resource, draft, onChange, rows.contents, isNew)}</div>
      <div className="master-editor-actions"><button className="button secondary" onClick={onCancel} type="button">{T.cancel}</button><button className="button primary" disabled={saving} onClick={onSave} type="button"><Save size={17} aria-hidden="true" />{saving ? T.saving : T.save}</button></div>
    </div>
  );
}

function renderEditorFields(resource: MasterResource, draft: MasterRow, onChange: (key: string, value: string | number | boolean | null) => void, contents: MasterRow[], isNew: boolean) {
  const activeToggle = <label className="toggle-field" key="is_active"><span>{T.enabled}</span><input checked={draft.is_active !== false} onChange={(event) => onChange("is_active", event.target.checked)} type="checkbox" /></label>;
  const sortField = <label key="sort_order">{T.sort}<input min={0} type="number" value={Number(draft.sort_order ?? 0)} onChange={(event) => onChange("sort_order", Number(event.target.value))} /></label>;
  if (resource === "imagines") return [<label key="category">{T.category}<select value={String(draft.category ?? "S1")} onChange={(event) => onChange("category", event.target.value)}>{IMAGINE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>, <label key="name">{T.imagineName}<input value={String(draft.name ?? "")} onChange={(event) => onChange("name", event.target.value)} /></label>, <label key="icon_url" className="span-2">{T.iconUrl}<input value={String(draft.icon_url ?? "")} onChange={(event) => onChange("icon_url", event.target.value)} placeholder="https://..." /></label>, sortField, activeToggle];
  if (resource === "contents") return [<label key="category">{T.contentCategory}<input value={String(draft.category ?? "")} onChange={(event) => onChange("category", event.target.value)} /></label>, <label key="name">{T.contentName}<input value={String(draft.name ?? "")} onChange={(event) => onChange("name", event.target.value)} /></label>, <label key="description" className="span-2">{T.description}<textarea value={String(draft.description ?? "")} onChange={(event) => onChange("description", event.target.value)} /></label>, <label key="icon_url" className="span-2">{T.iconUrl}<input value={String(draft.icon_url ?? "")} onChange={(event) => onChange("icon_url", event.target.value)} placeholder="https://..." /></label>, sortField, activeToggle];
  if (resource === "modes") return [<label key="content_id">{T.targetContent}<select value={Number(draft.content_id ?? contents[0]?.id ?? 0)} onChange={(event) => onChange("content_id", Number(event.target.value))}>{contents.map((content) => <option key={String(content.id)} value={Number(content.id)}>{content.category} / {content.name}</option>)}</select></label>, <label key="name">{T.modeName}<input value={String(draft.name ?? "")} onChange={(event) => onChange("name", event.target.value)} /></label>, sortField, activeToggle];
  if (resource === "classes") return [<label key="name">{T.className}<input value={String(draft.name ?? "")} onChange={(event) => onChange("name", event.target.value)} /></label>, <label key="role_key">{T.role}<select value={String(draft.role_key ?? "DPS")} onChange={(event) => onChange("role_key", event.target.value)}>{roleKeys.map((role) => <option key={role} value={role}>{getRoleLabel(role)}</option>)}</select></label>, <label key="icon_url" className="span-2">{T.iconUrl}<input value={String(draft.icon_url ?? "")} onChange={(event) => onChange("icon_url", event.target.value)} placeholder="https://..." /></label>, sortField, activeToggle];
  return [<label key="key">{T.key}<select disabled={!isNew} value={String(draft.key ?? "DPS")} onChange={(event) => onChange("key", event.target.value)}>{["DPS", "TANK", "HEALER"].map((role) => <option key={role} value={role}>{role}</option>)}</select></label>, <label key="label">{T.label}<input value={String(draft.label ?? "")} onChange={(event) => onChange("label", event.target.value)} /></label>, sortField, activeToggle];
}

function renderHeader(resource: MasterResource) {
  const common = <th>{T.action}</th>;
  if (resource === "imagines") return <tr><th>{T.category}</th><th>{T.name}</th><th>{T.iconUrl}</th><th>{T.sort}</th><th>{T.status}</th>{common}</tr>;
  if (resource === "contents") return <tr><th>{T.contentCategory}</th><th>{T.name}</th><th>{T.description}</th><th>{T.sort}</th><th>{T.status}</th>{common}</tr>;
  if (resource === "modes") return <tr><th>{T.content}</th><th>{T.mode}</th><th>{T.sort}</th><th>{T.status}</th>{common}</tr>;
  if (resource === "classes") return <tr><th>{T.className}</th><th>{T.role}</th><th>{T.iconUrl}</th><th>{T.sort}</th><th>{T.status}</th>{common}</tr>;
  return <tr><th>{T.key}</th><th>{T.label}</th><th>{T.sort}</th><th>{T.status}</th>{common}</tr>;
}

function renderCells(resource: MasterResource, row: MasterRow, contents: MasterRow[]) {
  const status = <td><Status active={row.is_active !== false} /></td>;
  const sort = <td>{row.sort_order ?? 0}</td>;
  const icon = <td>{row.icon_url ? <ImageIcon size={17} aria-label={T.iconYes} /> : <span className="muted-inline">{T.unset}</span>}</td>;
  if (resource === "imagines") return <><td>{row.category}</td><td>{row.name}</td>{icon}{sort}{status}</>;
  if (resource === "contents") return <><td>{row.category}</td><td>{row.name}</td><td>{row.description || T.unset}</td>{sort}{status}</>;
  if (resource === "modes") return <><td>{getContentName(Number(row.content_id), contents)}</td><td>{row.name}</td>{sort}{status}</>;
  if (resource === "classes") return <><td>{row.name}</td><td>{getRoleLabel(String(row.role_key))}</td>{icon}{sort}{status}</>;
  return <><td>{row.key}</td><td>{row.label}</td>{sort}{status}</>;
}

function Status({ active }: { active: boolean }) {
  return <span className={active ? "status-pill open" : "status-pill closed"}><ToggleLeft size={14} aria-hidden="true" />{active ? T.enabled : T.disabled}</span>;
}

function getRowId(resource: MasterResource, row: MasterRow) {
  return resource === "roles" ? row.key : row.id;
}

function getDefaultDraft(resource: MasterResource, contents: MasterRow[]): MasterRow {
  if (resource === "imagines") return { category: "S1", name: "", sort_order: 0, icon_url: "", is_active: true };
  if (resource === "contents") return { category: "", name: "", description: "", sort_order: 0, icon_url: "", is_active: true };
  if (resource === "modes") return { content_id: Number(contents[0]?.id ?? 0), name: "", sort_order: 0, is_active: true };
  if (resource === "classes") return { name: "", role_key: "DPS", sort_order: 0, icon_url: "", is_active: true };
  return { key: "DPS", label: "DPS", sort_order: 0, is_active: true };
}

function getContentName(contentId: number, contents: MasterRow[]) {
  const content = contents.find((item) => Number(item.id) === contentId);
  return content ? `${content.category} / ${content.name}` : `ID ${contentId}`;
}

function getPrimaryLabel(resource: MasterResource, row: MasterRow) {
  if (resource === "roles") return String(row.label ?? row.key ?? "");
  return String(row.name ?? "");
}

function getSecondaryLabel(resource: MasterResource, row: MasterRow, contents: MasterRow[]) {
  if (resource === "modes") return getContentName(Number(row.content_id), contents);
  if (resource === "classes") return getRoleLabel(String(row.role_key));
  if (resource === "contents") return String(row.category ?? "");
  if (resource === "imagines") return String(row.category ?? "");
  return String(row.key ?? "");
}
