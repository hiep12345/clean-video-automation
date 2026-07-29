"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BufferState,
  DistributionJob,
  JobAction,
  JobState,
  QueueItem,
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
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [workView, setWorkView] = useState<WorkView>("ACTIONABLE");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyJob, setBusyJob] = useState<string | null>(null);
  const [teamOpen, setTeamOpen] = useState(false);
  const [mappingReviewOpen, setMappingReviewOpen] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/queue", { cache: "no-store" });
      const payload = (await response.json()) as QueueResponse & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Unable to load queue");
      setData(payload);
      setError("");
      setLastSyncedAt(new Date());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      const matchesView =
        workView === "ALL" ||
        (workView === "ACTIONABLE" && item.bufferState !== "COMPLETE") ||
        (workView === "MINE" &&
          item.jobs.some((job) => job.assigneeEmail === data.actor)) ||
        (workView === "BLOCKED" && item.bufferState === "BLOCKED") ||
        (workView === "COMPLETE" && item.bufferState === "COMPLETE");
      return matchesQuery && matchesChannel && matchesStatus && matchesView;
    });
  }, [channel, data.actor, data.items, query, status, workView]);

  const selected = filtered.find((item) => item.id === selectedId) ?? null;

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
      mine: data.items.filter((item) =>
        item.jobs.some((job) => job.assigneeEmail === data.actor),
      ).length,
    }),
    [data.actor, data.items],
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

  const viewOptions: Array<{
    id: WorkView;
    label: string;
    count: number;
    icon: "check" | "inbox" | "warning";
  }> = [
    {
      id: "ACTIONABLE",
      label: "Cần xử lý",
      count: data.items.length - stats.complete,
      icon: "inbox",
    },
    { id: "MINE", label: "Việc của tôi", count: stats.mine, icon: "check" },
    { id: "BLOCKED", label: "Đang vướng", count: stats.blocked, icon: "warning" },
    { id: "COMPLETE", label: "Đã hoàn tất", count: stats.complete, icon: "check" },
    { id: "ALL", label: "Tất cả", count: data.items.length, icon: "inbox" },
  ];

  return (
    <main className="ops-shell">
      <aside className="ops-rail">
        <div className="ops-brand">
          <span className="brand-mark">DH</span>
          <div>
            <strong>Distribution Hub</strong>
            <span>Điều phối đăng bài</span>
          </div>
        </div>

        <nav className="view-nav" aria-label="Phạm vi công việc">
          <p className="nav-label">CÔNG VIỆC</p>
          {viewOptions.map((view) => (
            <button
              key={view.id}
              className={workView === view.id ? "view-item active" : "view-item"}
              onClick={() => {
                setWorkView(view.id);
                setStatus("ALL");
              }}
            >
              <Icon name={view.icon} size={17} />
              <span>{view.label}</span>
              <b>{view.count}</b>
            </button>
          ))}
        </nav>

        <nav className="channel-section" aria-label="Kênh nội dung">
          <p className="nav-label">KÊNH</p>
          <button
            className={channel === "ALL" ? "channel-item active" : "channel-item"}
            onClick={() => setChannel("ALL")}
          >
            <span className="all-channel-mark" />
            <span>Tất cả kênh</span>
            <b>{data.items.length}</b>
          </button>
          {channels.map((code) => (
            <button
              key={code}
              className={channel === code ? "channel-item active" : "channel-item"}
              onClick={() => setChannel(code)}
            >
              <span className={`channel-bullet channel-${code.toLowerCase()}`} />
              <span>{code}</span>
              <b>
                {data.items.filter((item) => item.channelCode === code).length}
              </b>
            </button>
          ))}
        </nav>

        {data.membership.canManageTeam && (
          <div className="admin-tools">
            <p className="nav-label">QUẢN TRỊ</p>
            <button onClick={() => setMappingReviewOpen(true)}>
              <Icon name="settings" size={17} />
              <span>Mapping Meta</span>
            </button>
            <button onClick={() => setTeamOpen(true)}>
              <Icon name="users" size={17} />
              <span>Thành viên</span>
            </button>
          </div>
        )}

        <div className="ops-profile">
          <span className="avatar">{initials(data.actor || "LO")}</span>
          <div>
            <strong>{data.actor ? data.actor.split("@")[0] : "Đang tải"}</strong>
            <span>
              {data.membership.role === "ADMIN"
                ? "Quản trị viên"
                : data.membership.role === "OPERATOR"
                  ? "Người đăng bài"
                  : "Chỉ xem"}
            </span>
          </div>
        </div>
      </aside>

      <section className="queue-pane">
        <header className="queue-header">
          <div>
            <p className="eyebrow">HÔM NAY</p>
            <h1>Công việc đăng bài</h1>
            <p>Chọn một bài, sau đó thực hiện hành động tiếp theo ở bên phải.</p>
          </div>
          <div className="queue-header-actions">
            <span
              className={`live-indicator${error ? " is-error" : refreshing ? " is-syncing" : ""}`}
              role="status"
            >
              <i />
              {error
                ? "Cần kết nối lại"
                : refreshing
                  ? "Đang đồng bộ"
                  : lastSyncedAt
                    ? `Đã đồng bộ ${lastSyncedAt.toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "Đang kết nối"}
            </span>
            <button
              className={`icon-button${refreshing ? " is-refreshing" : ""}`}
              onClick={() => load()}
              disabled={refreshing}
              aria-label="Làm mới danh sách"
              title="Làm mới"
            >
              <Icon name="refresh" />
            </button>
          </div>
        </header>

        <div className="queue-controls">
          <label className="ops-search">
            <Icon name="search" size={17} />
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
            <option value="ALL">Mọi trạng thái</option>
            <option value="READY">Sẵn sàng</option>
            <option value="IN_PROGRESS">Đang làm</option>
            <option value="BLOCKED">Đang vướng</option>
            <option value="COMPLETE">Hoàn tất</option>
          </select>
          {(query || status !== "ALL" || channel !== "ALL") && (
            <button
              className="button button-ghost"
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

        <div className="mobile-tools" aria-label="Bộ lọc và quản trị nhanh">
          <label>
            <span>Kênh</span>
            <select
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              aria-label="Lọc theo kênh"
            >
              <option value="ALL">Tất cả kênh</option>
              {channels.map((code) => (
                <option key={code} value={code}>
                  {code} ·{" "}
                  {data.items.filter((item) => item.channelCode === code).length} bài
                </option>
              ))}
            </select>
          </label>
          {data.membership.canManageTeam && (
            <div className="mobile-admin-actions">
              <button
                className="button button-secondary"
                onClick={() => setMappingReviewOpen(true)}
              >
                <Icon name="settings" size={16} />
                Mapping
              </button>
              <button
                className="button button-secondary"
                onClick={() => setTeamOpen(true)}
              >
                <Icon name="users" size={16} />
                Thành viên
              </button>
            </div>
          )}
        </div>

        <div className="queue-summary">
          <strong>{filtered.length} bài</strong>
          <span>
            {stats.ready} sẵn sàng · {stats.active} đang làm · {stats.blocked}{" "}
            đang vướng
          </span>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button
              className="button button-secondary"
              disabled={refreshing}
              onClick={() => load()}
            >
              {refreshing ? "Đang thử lại…" : "Thử lại"}
            </button>
          </div>
        )}

        <div className="work-list" aria-live="polite">
          {loading ? (
            <div className="queue-skeleton" aria-label="Đang tải danh sách">
              {[0, 1, 2, 3, 4].map((item) => (
                <span key={item} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <strong>Không có công việc phù hợp</strong>
              <span>Thử đổi phạm vi, kênh hoặc từ khóa tìm kiếm.</span>
            </div>
          ) : (
            filtered.map((item) => {
              const active = selectedId === item.id;
              return (
                <button
                  className={active ? "work-item active" : "work-item"}
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  aria-pressed={active}
                >
                  <span className="work-type" aria-hidden="true">
                    {item.contentType.toLowerCase() === "photo" ? "ẢNH" : "VIDEO"}
                  </span>
                  <span className="work-content">
                    <span className="work-title-line">
                      <strong title={item.title}>{item.title}</strong>
                      <span
                        className={`channel-tag channel-${item.channelCode.toLowerCase()}`}
                      >
                        {item.channelCode}
                      </span>
                    </span>
                    <span className="work-progress">
                      {item.jobs.map((job) => (
                        <PlatformMark key={job.id} job={job} />
                      ))}
                    </span>
                    <span className="work-next">
                      <span className="next-label">{nextAction(item, data.actor)}</span>
                      <span>{formatDate(item.producedAt)}</span>
                    </span>
                  </span>
                  <Icon name="chevron" size={17} />
                </button>
              );
            })
          )}
        </div>
      </section>

      {selected ? (
        <ContentInspector
          item={selected}
          actor={data.actor}
          busyJob={busyJob}
          onAction={act}
          onClose={() => setSelectedId(null)}
        />
      ) : (
        <aside className="workbench-detail detail-empty">
          <span className="detail-empty-icon">
            <Icon name="inbox" size={24} />
          </span>
          <strong>Chọn một bài để bắt đầu</strong>
          <p>Chi tiết nền tảng và hành động tiếp theo sẽ xuất hiện tại đây.</p>
        </aside>
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

type WorkView = "ACTIONABLE" | "MINE" | "BLOCKED" | "COMPLETE" | "ALL";

function Icon({
  name,
  size = 18,
}: {
  name:
    | "check"
    | "chevron"
    | "inbox"
    | "refresh"
    | "search"
    | "settings"
    | "users"
    | "warning"
    | "x";
  size?: number;
}) {
  const paths = {
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    inbox: (
      <>
        <path d="M4 4h16v13H4z" />
        <path d="M4 13h4l2 3h4l2-3h4" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5" />
        <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
      </>
    ),
    warning: (
      <>
        <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    x: <path d="M18 6 6 18M6 6l12 12" />,
  };

  return (
    <svg
      aria-hidden="true"
      className="ui-icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        {paths[name]}
      </g>
    </svg>
  );
}

function nextAction(item: QueueItem, actor: string) {
  if (item.bufferState === "COMPLETE") return "Đã hoàn tất";
  if (item.bufferState === "BLOCKED") return "Kiểm tra vướng mắc";
  if (
    item.jobs.some(
      (job) =>
        job.assigneeEmail === actor &&
        ["CLAIMED", "SCHEDULED"].includes(job.state),
    )
  ) {
    return "Tiếp tục xử lý";
  }
  if (item.jobs.some((job) => job.state === "READY")) return "Nhận xử lý";
  return "Xem tiến độ";
}

function ContentInspector({
  item,
  actor,
  busyJob,
  onAction,
  onClose,
}: {
  item: QueueItem;
  actor: string;
  busyJob: string | null;
  onAction: JobPanelProps["onAction"];
  onClose: () => void;
}) {
  return (
    <aside className="workbench-detail" aria-label="Chi tiết công việc đăng bài">
      <header className="inspector-head">
        <div className="inspector-heading">
          <div className="inspector-meta">
            <span
              className={`channel-tag channel-${item.channelCode.toLowerCase()}`}
            >
              {item.channelCode}
            </span>
            <StatusPill state={item.bufferState} />
          </div>
          <h2>{item.title}</h2>
          <p>{nextAction(item, actor)}</p>
        </div>
        <button
          className="icon-button inspector-close"
          onClick={onClose}
          aria-label="Đóng chi tiết"
        >
          <Icon name="x" />
        </button>
      </header>

      <div className="inspector-scroll">
        <section className="content-facts" aria-label="Thông tin nội dung">
          <div>
            <span>Định dạng</span>
            <strong>
              {item.contentType.toLowerCase() === "photo" ? "Ảnh" : "Video"}
            </strong>
          </div>
          <div>
            <span>Ngày tạo</span>
            <strong>{formatDate(item.producedAt)}</strong>
          </div>
          <div>
            <span>Điểm QA</span>
            <strong>{item.qaScore?.toFixed(1) ?? "—"}</strong>
          </div>
        </section>

        {item.driveUrl && (
          <a
            className="drive-link"
            href={item.driveUrl}
            target="_blank"
            rel="noreferrer"
          >
            Mở file nguồn trên Google Drive
            <span aria-hidden="true">↗</span>
          </a>
        )}

        <div className="inspector-section-title">
          <div>
            <h3>Nền tảng đăng bài</h3>
            <p>Chỉ xử lý hành động đang được hiển thị cho từng nền tảng.</p>
          </div>
          <span>{item.jobs.length}</span>
        </div>

        {item.jobs.map((job) => (
          <JobPanel
            key={job.id}
            job={job}
            actor={actor}
            busy={busyJob === job.id}
            onAction={onAction}
          />
        ))}

        <div className="audit-note">
          <strong>Hệ thống tự lưu lịch sử thao tác</strong>
          <p>
            Người thực hiện, thời gian, phiên bản và link bài đăng đều được ghi
            nhận. Trạng thái tổng được tính từ dữ liệu thực tế.
          </p>
        </div>

        <details className="technical-details">
          <summary>Thông tin kỹ thuật</summary>
          <code>{item.id}</code>
        </details>
      </div>
    </aside>
  );
}
