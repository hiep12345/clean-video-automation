"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  TeamMember,
  TeamResponse,
  TeamRole,
} from "@/lib/types";

type Draft = {
  email: string;
  displayName: string;
  role: TeamRole;
  active: boolean;
  channelCodes: string[];
  version: number;
};

const blankDraft: Draft = {
  email: "",
  displayName: "",
  role: "OPERATOR",
  active: true,
  channelCodes: [],
  version: 0,
};

const roleLabel: Record<TeamRole, string> = {
  ADMIN: "Quản trị",
  OPERATOR: "Đăng bài",
  VIEWER: "Chỉ xem",
};

function draftFromMember(member: TeamMember): Draft {
  return {
    email: member.email,
    displayName: member.displayName,
    role: member.role,
    active: member.active,
    channelCodes: member.channelCodes,
    version: member.version,
  };
}

export function TeamPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<TeamResponse>({
    members: [],
    channels: [],
  });
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/team", { cache: "no-store" });
      const payload = (await response.json()) as TeamResponse & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Unable to load team");
      setData(payload);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function toggleChannel(code: string) {
    setDraft((current) => ({
      ...current,
      channelCodes: current.channelCodes.includes(code)
        ? current.channelCodes.filter((item) => item !== code)
        : [...current.channelCodes, code].sort(),
    }));
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          email: draft.email,
          displayName: draft.displayName,
          role: draft.role,
          active: draft.active,
          channelCodes: draft.channelCodes,
          expectedVersion: draft.version,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        member?: TeamMember;
      };
      if (!response.ok) throw new Error(payload.error || "Unable to save member");
      await load();
      if (payload.member) {
        setDraft(draftFromMember(payload.member));
        setSuccess(`Đã lưu quyền cho ${payload.member.displayName}.`);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const needsChannels = draft.role !== "ADMIN" && draft.active;
  const emailIsValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(
    draft.email.trim().toLowerCase(),
  );
  const canSave =
    emailIsValid &&
    (!needsChannels || draft.channelCodes.length > 0);
  const saveHint = !draft.email.trim()
    ? "Nhập email để tạo hoặc cập nhật thành viên."
    : !emailIsValid
      ? "Email chưa đúng định dạng, ví dụ member@company.com."
      : needsChannels && draft.channelCodes.length === 0
        ? "Chọn ít nhất một kênh cho vai trò này."
        : draft.version
          ? "Các thay đổi sẽ có hiệu lực ở lần tải dữ liệu tiếp theo."
          : "Thành viên mới sẽ đăng nhập bằng đúng email này.";

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="drawer team-drawer"
        onMouseDown={(event) => event.stopPropagation()}
        aria-labelledby="team-panel-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="drawer-head">
          <div>
            <span className="section-kicker">QUẢN LÝ QUYỀN TRUY CẬP</span>
            <h2 id="team-panel-title">Thành viên và kênh phụ trách</h2>
            <p>Mỗi người chỉ nhìn thấy và xử lý các kênh được phân công.</p>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Đóng quản lý thành viên">
            ×
          </button>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="success-banner" role="status" aria-live="polite">
            {success}
          </div>
        )}

        <div className="team-layout">
          <section className="member-list">
            <div className="member-list-head">
              <strong>Danh sách thành viên</strong>
              {!loading && <span>{data.members.length} người</span>}
              <button
                className="button button-secondary"
                onClick={() => {
                  setDraft(blankDraft);
                  setError("");
                  setSuccess("");
                }}
              >
                + Thêm thành viên
              </button>
            </div>
            {loading ? (
              <p className="team-empty">Đang tải thành viên…</p>
            ) : data.members.length === 0 ? (
              <p className="team-empty">
                Chưa có thành viên. Chọn “Thêm thành viên” để bắt đầu.
              </p>
            ) : (
              data.members.map((member) => (
                <button
                  key={member.email}
                  className={
                    draft.email === member.email
                      ? "member-row active"
                      : "member-row"
                  }
                  onClick={() => setDraft(draftFromMember(member))}
                >
                  <span className="avatar">
                    {member.displayName.slice(0, 2).toUpperCase()}
                  </span>
                  <span>
                    <strong>{member.displayName}</strong>
                    <small>{member.email}</small>
                  </span>
                  <span className={`role-chip role-${member.role.toLowerCase()}`}>
                    {roleLabel[member.role]}
                  </span>
                  {!member.active && <b>Đã khóa</b>}
                </button>
              ))
            )}
          </section>

          <section className="member-editor">
            <div className="editor-title">
              <div>
                <strong>
                  {draft.version ? "Chỉnh sửa thành viên" : "Thêm thành viên mới"}
                </strong>
                <p>
                  Phân quyền được lưu trong hệ thống và có thể thay đổi bất cứ
                  lúc nào.
                </p>
              </div>
              {draft.version > 0 && <span>Phiên bản {draft.version}</span>}
            </div>

            <div className="job-form">
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  value={draft.email}
                  disabled={draft.version > 0}
                  aria-invalid={Boolean(draft.email.trim()) && !emailIsValid}
                  aria-describedby="team-save-hint"
                  onChange={(event) => {
                    setDraft((current) => ({
                      ...current,
                      email: event.target.value,
                    }));
                    setError("");
                    setSuccess("");
                  }}
                  placeholder="member@company.com"
                />
              </label>
              <label>
                Tên hiển thị <small>(không bắt buộc)</small>
                <input
                  value={draft.displayName}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  placeholder="Mặc định lấy từ email"
                />
              </label>
              <label>
                Vai trò
                <select
                  value={draft.role}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      role: event.target.value as TeamRole,
                    }))
                  }
                >
                  <option value="OPERATOR">Người đăng bài — cập nhật kênh được giao</option>
                  <option value="VIEWER">Chỉ xem — đọc kênh được giao</option>
                  <option value="ADMIN">Quản trị viên — toàn bộ kênh và thành viên</option>
                </select>
              </label>
            </div>

            <fieldset className="channel-picker">
              <legend>Kênh được phân công</legend>
              <p>Quản trị viên tự động nhìn thấy tất cả kênh.</p>
              <div>
                {data.channels.map((channel) => (
                  <label key={channel.code}>
                    <input
                      type="checkbox"
                      checked={draft.channelCodes.includes(channel.code)}
                      disabled={draft.role === "ADMIN"}
                      onChange={() => toggleChannel(channel.code)}
                    />
                    <span>{channel.code}</span>
                    {channel.name}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="active-toggle">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    active: event.target.checked,
                  }))
                }
              />
              <span>
                <strong>Cho phép truy cập</strong>
                <small>Tắt mục này để khóa quyền xem và cập nhật công việc.</small>
              </span>
            </label>

            <button
              className="button button-primary save-member"
              disabled={!canSave || saving}
              onClick={() => void save()}
              aria-describedby="team-save-hint"
            >
              {saving ? "Đang lưu…" : "Lưu phân quyền"}
            </button>
            <p
              id="team-save-hint"
              className={canSave ? "save-hint is-ready" : "save-hint"}
              role="status"
              aria-live="polite"
            >
              {saveHint}
            </p>
          </section>
        </div>

        <div className="audit-note">
          <strong>Nhiều người có thể làm việc cùng lúc.</strong>
          <p>
            Khi một người nhận xử lý, hệ thống chỉ khóa đúng bài và nền tảng đó.
            Các thành viên khác vẫn tiếp tục công việc của mình bình thường.
          </p>
        </div>
      </aside>
    </div>
  );
}
