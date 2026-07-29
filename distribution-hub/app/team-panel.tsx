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
      if (payload.member) setDraft(draftFromMember(payload.member));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const needsChannels = draft.role !== "ADMIN" && draft.active;
  const canSave =
    draft.email.trim().length > 3 &&
    (!needsChannels || draft.channelCodes.length > 0);

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="drawer team-drawer"
        onMouseDown={(event) => event.stopPropagation()}
        aria-label="Team and channel assignments"
      >
        <div className="drawer-head">
          <div>
            <span className="section-kicker">ACCESS CONTROL</span>
            <h2>Team assignments</h2>
            <p>Members can work concurrently inside their assigned channels.</p>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close team panel">
            ×
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="team-layout">
          <section className="member-list">
            <div className="member-list-head">
              <strong>Members</strong>
              <button
                className="button button-secondary"
                onClick={() => setDraft(blankDraft)}
              >
                + Add member
              </button>
            </div>
            {loading ? (
              <p className="team-empty">Loading team…</p>
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
                    {member.role}
                  </span>
                  {!member.active && <b>Inactive</b>}
                </button>
              ))
            )}
          </section>

          <section className="member-editor">
            <div className="editor-title">
              <div>
                <strong>{draft.version ? "Edit member" : "New member"}</strong>
                <p>
                  Assignment is stored in the database, never hard-coded in the
                  interface.
                </p>
              </div>
              {draft.version > 0 && <span>Version {draft.version}</span>}
            </div>

            <div className="job-form">
              <label>
                Email
                <input
                  type="email"
                  value={draft.email}
                  disabled={draft.version > 0}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="member@company.com"
                />
              </label>
              <label>
                Display name
                <input
                  value={draft.displayName}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  placeholder="Team member"
                />
              </label>
              <label>
                Role
                <select
                  value={draft.role}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      role: event.target.value as TeamRole,
                    }))
                  }
                >
                  <option value="OPERATOR">Operator — update assigned channels</option>
                  <option value="VIEWER">Viewer — read assigned channels</option>
                  <option value="ADMIN">Admin — all channels and team access</option>
                </select>
              </label>
            </div>

            <fieldset className="channel-picker">
              <legend>Assigned channels</legend>
              <p>Admins automatically see every channel.</p>
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
                <strong>Active access</strong>
                <small>Inactive members cannot read or change queue data.</small>
              </span>
            </label>

            <button
              className="button button-primary save-member"
              disabled={!canSave || saving}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save member assignment"}
            </button>
          </section>
        </div>

        <div className="audit-note">
          <strong>Concurrency is per platform job.</strong>
          <p>
            Assignments decide which channels a member can access. Claim locks
            only the selected content-platform job, so the rest of the team can
            continue working at the same time.
          </p>
        </div>
      </aside>
    </div>
  );
}
