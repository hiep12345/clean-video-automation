"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BufferState,
  DistributionJob,
  JobAction,
  JobState,
  QueueResponse,
} from "@/lib/types";

const stateLabel: Record<JobState | BufferState, string> = {
  READY: "Ready",
  CLAIMED: "Claimed",
  SCHEDULED: "Scheduled",
  UPLOADED: "Uploaded",
  BLOCKED: "Blocked",
  IN_PROGRESS: "In progress",
  COMPLETE: "Complete",
};

function initials(value: string) {
  return value.split("@")[0].slice(0, 2).toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function statusClass(state: JobState | BufferState) {
  return `status-pill status-${state.toLowerCase().replace("_", "-")}`;
}

function StatusPill({ state }: { state: JobState | BufferState }) {
  return <span className={statusClass(state)}>{stateLabel[state]}</span>;
}

function PlatformMark({ job }: { job: DistributionJob }) {
  return (
    <span className={`platform-mark platform-${job.platformColor}`}>
      <span className="platform-dot" />
      {job.platformName}
      <span className="platform-state">{stateLabel[job.state]}</span>
    </span>
  );
}

type JobPanelProps = {
  job: DistributionJob;
  actor: string;
  busy: boolean;
  onAction: (
    job: DistributionJob,
    action: JobAction,
    values?: Record<string, string>,
  ) => Promise<void>;
};

function JobPanel({ job, actor, busy, onAction }: JobPanelProps) {
  const [publishedUrl, setPublishedUrl] = useState(job.externalUrl ?? "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [blockedReason, setBlockedReason] = useState("");
  const mine = job.assigneeEmail === actor;

  return (
    <section className="job-card">
      <div className="job-card-head">
        <div>
          <PlatformMark job={job} />
          <p className="job-updated">Version {job.version}</p>
        </div>
        {job.assigneeEmail ? (
          <span className="assignee">
            <span className="avatar">{initials(job.assigneeEmail)}</span>
            {mine ? "You" : job.assigneeEmail.split("@")[0]}
          </span>
        ) : (
          <span className="unassigned">Unassigned</span>
        )}
      </div>

      {job.state === "READY" && (
        <div className="job-actions">
          <button
            className="button button-primary"
            disabled={busy}
            onClick={() => onAction(job, "claim")}
          >
            Claim this platform
          </button>
          <button
            className="button button-ghost"
            disabled={busy}
            onClick={() =>
              onAction(job, "block", {
                blockedReason:
                  blockedReason || "Needs manual review before upload",
              })
            }
          >
            Block
          </button>
        </div>
      )}

      {job.state === "CLAIMED" && mine && (
        <div className="job-form">
          <label>
            Published URL
            <input
              value={publishedUrl}
              onChange={(event) => setPublishedUrl(event.target.value)}
              placeholder="https://facebook.com/..."
            />
          </label>
          <button
            className="button button-success"
            disabled={busy || !publishedUrl}
            onClick={() =>
              onAction(job, "upload", { externalUrl: publishedUrl })
            }
          >
            Mark uploaded
          </button>
          <div className="form-split">
            <label>
              Schedule time
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </label>
            <button
              className="button button-secondary"
              disabled={busy || !scheduledAt}
              onClick={() => onAction(job, "schedule", { scheduledAt })}
            >
              Schedule
            </button>
          </div>
          <label>
            Blocked reason
            <input
              value={blockedReason}
              onChange={(event) => setBlockedReason(event.target.value)}
              placeholder="What prevents this upload?"
            />
          </label>
          <div className="job-actions">
            <button
              className="button button-danger-soft"
              disabled={busy || blockedReason.trim().length < 3}
              onClick={() =>
                onAction(job, "block", { blockedReason })
              }
            >
              Block with reason
            </button>
            <button
              className="button button-ghost"
              disabled={busy}
              onClick={() => onAction(job, "release")}
            >
              Release
            </button>
          </div>
        </div>
      )}

      {job.state === "CLAIMED" && !mine && (
        <p className="job-note">
          Locked by {job.assigneeEmail}. The claim expires at{" "}
          {job.claimExpiresAt
            ? new Date(job.claimExpiresAt).toLocaleTimeString()
            : "—"}.
        </p>
      )}

      {job.state === "SCHEDULED" && (
        <div className="job-form">
          <p className="job-note">
            Scheduled for{" "}
            {job.scheduledAt
              ? new Date(job.scheduledAt).toLocaleString()
              : "—"}
          </p>
          {mine && (
            <>
              <label>
                Published URL
                <input
                  value={publishedUrl}
                  onChange={(event) => setPublishedUrl(event.target.value)}
                  placeholder="Paste the live post URL"
                />
              </label>
              <button
                className="button button-success"
                disabled={busy || !publishedUrl}
                onClick={() =>
                  onAction(job, "upload", { externalUrl: publishedUrl })
                }
              >
                Confirm uploaded
              </button>
            </>
          )}
        </div>
      )}

      {job.state === "BLOCKED" && (
        <div className="blocked-box">
          <p>{job.blockedReason}</p>
          <button
            className="button button-secondary"
            disabled={busy}
            onClick={() => onAction(job, "unblock")}
          >
            Resolve and return to Ready
          </button>
        </div>
      )}

      {job.state === "UPLOADED" && (
        <div className="receipt-box">
          <div>
            <strong>Verified manual receipt</strong>
            <p>
              {job.uploadedAt
                ? new Date(job.uploadedAt).toLocaleString()
                : "Recorded"}
            </p>
          </div>
          {job.externalUrl && (
            <a href={job.externalUrl} target="_blank" rel="noreferrer">
              Open post ↗
            </a>
          )}
        </div>
      )}
    </section>
  );
}

export function DistributionHub() {
  const [data, setData] = useState<QueueResponse>({
    actor: "",
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyJob, setBusyJob] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/queue", { cache: "no-store" });
      const payload = (await response.json()) as QueueResponse & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Unable to load queue");
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

  const channels = useMemo(
    () =>
      [...new Set(data.items.map((item) => item.channelCode))].sort(),
    [data.items],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return data.items.filter((item) => {
      const matchesQuery =
        !normalized ||
        item.id.toLowerCase().includes(normalized) ||
        item.title.toLowerCase().includes(normalized);
      const matchesChannel =
        channel === "ALL" || item.channelCode === channel;
      const matchesStatus =
        status === "ALL" || item.bufferState === status;
      return matchesQuery && matchesChannel && matchesStatus;
    });
  }, [channel, data.items, query, status]);

  const selected =
    data.items.find((item) => item.id === selectedId) ?? null;

  const stats = useMemo(
    () => ({
      ready: data.items.filter((item) => item.bufferState === "READY").length,
      active: data.items.filter(
        (item) => item.bufferState === "IN_PROGRESS",
      ).length,
      blocked: data.items.filter((item) => item.bufferState === "BLOCKED")
        .length,
      complete: data.items.filter((item) => item.bufferState === "COMPLETE")
        .length,
    }),
    [data.items],
  );

  async function act(
    job: DistributionJob,
    action: JobAction,
    values: Record<string, string> = {},
  ) {
    setBusyJob(job.id);
    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          action,
          expectedVersion: job.version,
          idempotencyKey: crypto.randomUUID(),
          ...values,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Action failed");
      await load();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Action failed",
      );
    } finally {
      setBusyJob(null);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">D</span>
          <div>
            <strong>Distribution Hub</strong>
            <span>Manual upload control</span>
          </div>
        </div>

        <nav className="channel-nav" aria-label="Channels">
          <button
            className={channel === "ALL" ? "nav-item active" : "nav-item"}
            onClick={() => setChannel("ALL")}
          >
            <span>▦</span> All channels
            <b>{data.items.length}</b>
          </button>
          {channels.map((code) => (
            <button
              key={code}
              className={channel === code ? "nav-item active" : "nav-item"}
              onClick={() => setChannel(code)}
            >
              <span className={`channel-bullet channel-${code.toLowerCase()}`} />
              {code}
              <b>
                {data.items.filter((item) => item.channelCode === code).length}
              </b>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="avatar">{initials(data.actor || "LO")}</span>
          <div>
            <strong>{data.actor ? data.actor.split("@")[0] : "Loading"}</strong>
            <span>Authenticated operator</span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">OPERATIONS / DISTRIBUTION</p>
            <h1>Upload queue</h1>
            <p className="subtitle">
              One controlled action per content and platform. No direct status
              edits.
            </p>
          </div>
          <div className="header-actions">
            <button className="button button-secondary" onClick={() => load()}>
              Refresh
            </button>
            <span className="live-indicator">
              <i /> API controlled
            </span>
          </div>
        </header>

        <div className="stat-strip">
          <div><span>Ready</span><strong>{stats.ready}</strong></div>
          <div><span>In progress</span><strong>{stats.active}</strong></div>
          <div><span>Blocked</span><strong>{stats.blocked}</strong></div>
          <div><span>Complete</span><strong>{stats.complete}</strong></div>
        </div>

        <div className="database-toolbar">
          <div className="view-tabs">
            <button className="view-tab active">Table</button>
            <button className="view-tab" disabled>Board</button>
            <button className="view-tab" disabled>Audit</button>
          </div>
          <div className="filters">
            <label className="search-box">
              <span>⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search content or ID"
              />
            </label>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="READY">Ready</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="BLOCKED">Blocked</option>
              <option value="COMPLETE">Complete</option>
            </select>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="table-card">
          <div className="table-head row-grid">
            <span>Content</span>
            <span>Channel</span>
            <span>Platforms</span>
            <span>Buffer</span>
            <span>Produced</span>
            <span>QA</span>
            <span />
          </div>
          {loading ? (
            <div className="empty-state">Loading controlled queue…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">No content matches this view.</div>
          ) : (
            filtered.map((item) => (
              <button
                className="table-row row-grid"
                key={item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="content-cell">
                  <span className="content-icon">
                    {item.contentType.toLowerCase() === "photo" ? "▧" : "▶"}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.id}</small>
                  </span>
                </span>
                <span>
                  <span className={`channel-tag channel-${item.channelCode.toLowerCase()}`}>
                    {item.channelCode}
                  </span>
                </span>
                <span className="platforms-cell">
                  {item.jobs.map((job) => (
                    <PlatformMark key={job.id} job={job} />
                  ))}
                </span>
                <span><StatusPill state={item.bufferState} /></span>
                <span className="muted">{formatDate(item.producedAt)}</span>
                <span className="qa-score">
                  {item.qaScore?.toFixed(1) ?? "—"}
                </span>
                <span className="row-arrow">›</span>
              </button>
            ))
          )}
          <div className="table-footer">
            {filtered.length} content items · {filtered.reduce((count, item) => count + item.jobs.length, 0)} exact platform jobs
          </div>
        </div>
      </section>

      {selected && (
        <div className="drawer-backdrop" onMouseDown={() => setSelectedId(null)}>
          <aside
            className="drawer"
            onMouseDown={(event) => event.stopPropagation()}
            aria-label="Content distribution details"
          >
            <div className="drawer-head">
              <div>
                <span className={`channel-tag channel-${selected.channelCode.toLowerCase()}`}>
                  {selected.channelCode}
                </span>
                <h2>{selected.title}</h2>
                <p>{selected.id}</p>
              </div>
              <button
                className="close-button"
                onClick={() => setSelectedId(null)}
                aria-label="Close panel"
              >
                ×
              </button>
            </div>

            <div className="content-summary">
              <div><span>Aggregate</span><StatusPill state={selected.bufferState} /></div>
              <div><span>QA score</span><strong>{selected.qaScore?.toFixed(1) ?? "—"}</strong></div>
              <div><span>Produced</span><strong>{formatDate(selected.producedAt)}</strong></div>
              {selected.driveUrl && (
                <a href={selected.driveUrl} target="_blank" rel="noreferrer">
                  Open Drive asset ↗
                </a>
              )}
            </div>

            <div className="drawer-section-title">
              <h3>Platform jobs</h3>
              <span>{selected.jobs.length} targets</span>
            </div>
            {selected.jobs.map((job) => (
              <JobPanel
                key={job.id}
                job={job}
                actor={data.actor}
                busy={busyJob === job.id}
                onAction={act}
              />
            ))}

            <div className="audit-note">
              <strong>Every action is immutable.</strong>
              <p>
                The API records operator identity, job version, transition,
                receipt and timestamp. Aggregate status is calculated, never
                edited.
              </p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
