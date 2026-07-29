"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BufferState,
  DistributionJob,
  JobAction,
  JobState,
  QueueResponse,
} from "@/lib/types";
import { MappingReviewPanel } from "./mapping-review-panel";
import { TeamPanel } from "./team-panel";

const stateLabel: Record<JobState | BufferState, string> = {
  READY: "Sẵn sàng",
  CLAIMED: "Đang xử lý",
  SCHEDULED: "Đã lên lịch",
  UPLOADED: "Đã đăng",
  BLOCKED: "Đang vướng",
  IN_PROGRESS: "Đang làm",
  COMPLETE: "Hoàn tất",
};

function initials(value: string) {
  return value.split("@")[0].slice(0, 2).toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function statusClass(state: JobState | BufferState) {
  return `status-pill status-${state.toLowerCase().replace("_", "-")}`;
}

function StatusPill({ state }: { state: JobState | BufferState }) {
  return <span className={statusClass(state)}>{stateLabel[state]}</span>;
}

function metaContentId(value: string): string | null {
  try {
    const url = new URL(value);
    const id = url.searchParams.get("content_id") ?? "";
    if (
      url.protocol !== "https:" ||
      !["business.facebook.com", "www.business.facebook.com"].includes(
        url.hostname.toLowerCase(),
      ) ||
      !/^\d{6,30}$/.test(id)
    ) {
      return null;
    }
    return id;
  } catch {
    return null;
  }
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
  const [publishedUrlError, setPublishedUrlError] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [blockedReason, setBlockedReason] = useState("");
  const mine = job.assigneeEmail === actor;
  const isMeta = job.platformCode === "fb-ig";
  const parsedMetaContentId = isMeta ? metaContentId(publishedUrl) : null;
  const canConfirmPublished = isMeta
    ? Boolean(parsedMetaContentId)
    : Boolean(publishedUrl);

  function validatePublishedUrl() {
    if (!publishedUrl) {
      setPublishedUrlError("");
    } else if (isMeta && !parsedMetaContentId) {
      setPublishedUrlError(
        "Hãy dán URL Insights của Meta Business Suite có tham số content_id.",
      );
    } else {
      setPublishedUrlError("");
    }
  }

  const publishedUrlField = (
    <label>
      {isMeta ? "Link Meta Business Suite" : "Link bài đã đăng"}
      <input
        type="url"
        value={publishedUrl}
        onChange={(event) => {
          setPublishedUrl(event.target.value);
          if (publishedUrlError) setPublishedUrlError("");
        }}
        onBlur={validatePublishedUrl}
        placeholder={
          isMeta
            ? "https://business.facebook.com/...&content_id=..."
            : "https://..."
        }
        aria-describedby={
          isMeta ? `${job.id}-meta-help ${job.id}-meta-error` : undefined
        }
        aria-invalid={Boolean(publishedUrlError)}
      />
      {isMeta && (
        <small id={`${job.id}-meta-help`} className="field-help">
          Mở Insights của bài trong Meta Business Suite rồi sao chép toàn bộ URL.
          Hệ thống tự lấy content_id; member không phải nhập ID riêng.
        </small>
      )}
      {publishedUrlError && (
        <small
          id={`${job.id}-meta-error`}
          className="field-error"
          role="alert"
        >
          {publishedUrlError}
        </small>
      )}
      {isMeta && parsedMetaContentId && (
        <small className="field-success" role="status">
          Đã nhận content_id: {parsedMetaContentId}
        </small>
      )}
    </label>
  );

  return (
    <section className="job-card">
      <div className="job-card-head">
        <div>
          <PlatformMark job={job} />
          <p className="job-updated">Phiên bản {job.version}</p>
        </div>
        {job.assigneeEmail ? (
          <span className="assignee">
            <span className="avatar">{initials(job.assigneeEmail)}</span>
            {mine ? "Bạn đang xử lý" : job.assigneeEmail.split("@")[0]}
          </span>
        ) : (
          <span className="unassigned">Chưa có người nhận</span>
        )}
      </div>

      {job.state === "READY" && (
        <div className="job-actions">
          <button
            className="button button-primary"
            disabled={busy}
            onClick={() => onAction(job, "claim")}
          >
            Nhận xử lý nền tảng này
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
            Báo đang vướng
          </button>
        </div>
      )}

      {job.state === "CLAIMED" && mine && (
        <div className="job-form">
          {publishedUrlField}
          <button
            className="button button-success"
            disabled={busy || !canConfirmPublished}
            onClick={() =>
              onAction(job, "upload", { externalUrl: publishedUrl })
            }
          >
            {busy ? "Đang lưu…" : "Xác nhận đã đăng"}
          </button>
          <div className="form-split">
            <label>
              Thời gian dự kiến đăng
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
              Lưu lịch đăng
            </button>
          </div>
          <label>
            Vấn đề đang gặp
            <input
              value={blockedReason}
              onChange={(event) => setBlockedReason(event.target.value)}
              placeholder="Ví dụ: thiếu caption, link Drive lỗi..."
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
              Lưu vấn đề
            </button>
            <button
              className="button button-ghost"
              disabled={busy}
              onClick={() => onAction(job, "release")}
            >
              Trả việc
            </button>
          </div>
        </div>
      )}

      {job.state === "CLAIMED" && !mine && (
        <p className="job-note">
          {job.assigneeEmail} đang xử lý nền tảng này. Quyền giữ việc hết hạn lúc{" "}
          {job.claimExpiresAt
            ? new Date(job.claimExpiresAt).toLocaleTimeString()
            : "—"}.
        </p>
      )}

      {job.state === "SCHEDULED" && (
        <div className="job-form">
          <p className="job-note">
            Dự kiến đăng lúc{" "}
            {job.scheduledAt
              ? new Date(job.scheduledAt).toLocaleString()
              : "—"}
          </p>
          {mine && (
            <>
              {publishedUrlField}
              <button
                className="button button-success"
                disabled={busy || !canConfirmPublished}
                onClick={() =>
                  onAction(job, "upload", { externalUrl: publishedUrl })
                }
              >
                {busy ? "Đang lưu…" : "Xác nhận đã đăng"}
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
            Đã xử lý xong, đưa về Sẵn sàng
          </button>
        </div>
      )}

      {job.state === "UPLOADED" && (
        <div className="receipt-box">
          <div>
            <strong>
              {job.receipt
                ? "Đã lưu Meta publication receipt"
                : "Đã lưu bằng chứng đăng bài"}
            </strong>
            <p>
              {job.uploadedAt
                ? new Date(job.uploadedAt).toLocaleString()
                : "Recorded"}
            </p>
            {job.receipt && (
              <div className="receipt-meta">
                <span>
                  content_id <code>{job.receipt.metaContentId}</code>
                </span>
                <span>
                  Đăng bài:{" "}
                  <b>
                    {job.receipt.publicationStatus === "REPORTED"
                      ? "Member đã báo cáo"
                      : "Đã xác minh"}
                  </b>
                </span>
                <span>
                  Analytics:{" "}
                  <b>
                    {job.receipt.analyticsLinkStatus === "PENDING"
                      ? "Chờ mapping"
                      : job.receipt.analyticsLinkStatus === "PARTIAL"
                        ? "Đã map một phần"
                        : job.receipt.analyticsLinkStatus === "LINKED"
                          ? "Đã liên kết"
                          : "Cần kiểm tra"}
                  </b>
                </span>
              </div>
            )}
          </div>
          {job.externalUrl && (
            <a href={job.externalUrl} target="_blank" rel="noreferrer">
              {job.receipt ? "Mở Meta Insights ↗" : "Mở bài đăng ↗"}
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
    membership: {
      email: "",
      displayName: "",
      role: "VIEWER",
      channelCodes: [],
      canManageTeam: false,
    },
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyJob, setBusyJob] = useState<string | null>(null);
  const [teamOpen, setTeamOpen] = useState(false);
  const [mappingReviewOpen, setMappingReviewOpen] = useState(false);

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

  useEffect(() => {
    if (!selectedId && !teamOpen && !mappingReviewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (mappingReviewOpen) setMappingReviewOpen(false);
      else if (teamOpen) setTeamOpen(false);
      else setSelectedId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mappingReviewOpen, selectedId, teamOpen]);

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
          <span className="brand-mark">DH</span>
          <div>
            <strong>Distribution Hub</strong>
            <span>Trung tâm đăng bài thủ công</span>
          </div>
        </div>

        <p className="nav-label">KÊNH NỘI DUNG</p>
        <nav className="channel-nav" aria-label="Channels">
          <button
            className={channel === "ALL" ? "nav-item active" : "nav-item"}
            onClick={() => setChannel("ALL")}
          >
            <span className="all-channel-mark" /> Tất cả kênh
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
            <strong>{data.actor ? data.actor.split("@")[0] : "Đang tải"}</strong>
            <span>
              {data.membership.role === "ADMIN"
                ? "Quản trị viên"
                : data.membership.role === "OPERATOR"
                  ? "Người đăng bài"
                  : "Chỉ xem"}
              {data.membership.role !== "ADMIN" &&
              data.membership.channelCodes.length
                ? ` · ${data.membership.channelCodes.join(", ")}`
                : ""}
            </span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">DISTRIBUTION HUB</p>
            <h1>Công việc đăng bài</h1>
            <p className="subtitle">
              Chọn một bài để xử lý riêng từng nền tảng. Trạng thái được hệ
              thống tự tính từ thao tác thực tế.
            </p>
          </div>
          <div className="header-actions">
            {data.membership.canManageTeam && (
              <>
                <button
                  className="button button-secondary"
                  onClick={() => setMappingReviewOpen(true)}
                >
                  Mapping Meta
                </button>
                <button
                  className="button button-secondary"
                  onClick={() => setTeamOpen(true)}
                >
                  Thành viên
                </button>
              </>
            )}
            <button className="button button-secondary" onClick={() => load()}>
              Làm mới
            </button>
            <span className="live-indicator">
              <i /> Đang kết nối
            </span>
          </div>
        </header>

        <div className="stat-strip" aria-label="Tổng quan trạng thái">
          <button
            className={status === "READY" ? "metric-card active" : "metric-card"}
            onClick={() => setStatus(status === "READY" ? "ALL" : "READY")}
          >
            <span className="metric-dot metric-ready" />
            <span>
              <b>Sẵn sàng</b>
              <small>Có thể nhận xử lý ngay</small>
            </span>
            <strong>{stats.ready}</strong>
          </button>
          <button
            className={
              status === "IN_PROGRESS" ? "metric-card active" : "metric-card"
            }
            onClick={() =>
              setStatus(status === "IN_PROGRESS" ? "ALL" : "IN_PROGRESS")
            }
          >
            <span className="metric-dot metric-progress" />
            <span>
              <b>Đang làm</b>
              <small>Đã có người nhận việc</small>
            </span>
            <strong>{stats.active}</strong>
          </button>
          <button
            className={
              status === "BLOCKED" ? "metric-card active" : "metric-card"
            }
            onClick={() => setStatus(status === "BLOCKED" ? "ALL" : "BLOCKED")}
          >
            <span className="metric-dot metric-blocked" />
            <span>
              <b>Đang vướng</b>
              <small>Cần kiểm tra hoặc bổ sung</small>
            </span>
            <strong>{stats.blocked}</strong>
          </button>
          <button
            className={
              status === "COMPLETE" ? "metric-card active" : "metric-card"
            }
            onClick={() =>
              setStatus(status === "COMPLETE" ? "ALL" : "COMPLETE")
            }
          >
            <span className="metric-dot metric-complete" />
            <span>
              <b>Hoàn tất</b>
              <small>Đã đủ các nền tảng</small>
            </span>
            <strong>{stats.complete}</strong>
          </button>
        </div>

        <div className="database-toolbar">
          <div className="result-heading">
            <strong>Danh sách nội dung</strong>
            <span>{filtered.length} bài phù hợp</span>
          </div>
          <div className="filters">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm tên bài hoặc mã nội dung"
                aria-label="Tìm nội dung"
              />
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Lọc theo trạng thái"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="READY">Sẵn sàng</option>
              <option value="IN_PROGRESS">Đang làm</option>
              <option value="BLOCKED">Đang vướng</option>
              <option value="COMPLETE">Hoàn tất</option>
            </select>
            {(query || status !== "ALL" || channel !== "ALL") && (
              <button
                className="button button-ghost clear-filter"
                onClick={() => {
                  setQuery("");
                  setStatus("ALL");
                  setChannel("ALL");
                }}
              >
                Xóa lọc
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <div className="table-card">
          <div className="table-head row-grid">
            <span>Nội dung</span>
            <span>Kênh</span>
            <span>Nền tảng</span>
            <span>Trạng thái</span>
            <span>Ngày tạo</span>
            <span>QA</span>
            <span />
          </div>
          {loading ? (
            <div className="empty-state">
              <span className="loading-ring" />
              <span>Đang tải danh sách công việc…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <strong>Không tìm thấy nội dung</strong>
              <span>Hãy thử đổi kênh, trạng thái hoặc từ khóa tìm kiếm.</span>
            </div>
          ) : (
            filtered.map((item) => (
              <button
                className="table-row row-grid"
                key={item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="content-cell">
                  <span className="content-icon" aria-hidden="true">
                    {item.contentType.toLowerCase() === "photo" ? "ẢNH" : "VIDEO"}
                  </span>
                  <span>
                    <strong title={item.title}>{item.title}</strong>
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
            <strong>{filtered.length} bài</strong>
            <span>
              {filtered.reduce((count, item) => count + item.jobs.length, 0)}{" "}
              công việc nền tảng độc lập
            </span>
          </div>
        </div>
      </section>

      {selected && (
        <div className="drawer-backdrop" onMouseDown={() => setSelectedId(null)}>
          <aside
            className="drawer"
            onMouseDown={(event) => event.stopPropagation()}
            aria-label="Chi tiết công việc đăng bài"
            aria-modal="true"
            role="dialog"
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
                aria-label="Đóng chi tiết"
              >
                ×
              </button>
            </div>

            <div className="content-summary">
              <div><span>Trạng thái tổng</span><StatusPill state={selected.bufferState} /></div>
              <div><span>Điểm QA</span><strong>{selected.qaScore?.toFixed(1) ?? "—"}</strong></div>
              <div><span>Ngày tạo</span><strong>{formatDate(selected.producedAt)}</strong></div>
              {selected.driveUrl && (
                <a href={selected.driveUrl} target="_blank" rel="noreferrer">
                  Mở file Google Drive ↗
                </a>
              )}
            </div>

            <div className="drawer-section-title">
              <h3>Xử lý theo nền tảng</h3>
              <span>{selected.jobs.length} nền tảng</span>
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
              <strong>Lịch sử thao tác được lưu tự động.</strong>
              <p>
                Hệ thống ghi nhận người thực hiện, thời gian, phiên bản và link
                bài đăng. Trạng thái tổng hợp được tính tự động nên không bị
                ghi đè bởi lần đồng bộ khác.
              </p>
            </div>
          </aside>
        </div>
      )}
      {teamOpen && <TeamPanel onClose={() => setTeamOpen(false)} />}
      {mappingReviewOpen && (
        <MappingReviewPanel
          onClose={() => setMappingReviewOpen(false)}
          onChanged={load}
        />
      )}
    </main>
  );
}
