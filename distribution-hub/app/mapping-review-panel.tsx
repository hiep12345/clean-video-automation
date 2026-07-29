"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  MappingReviewItem,
  MappingReviewResponse,
  PublicationAliasNamespace,
} from "@/lib/types";

type MappingReviewPanelProps = {
  onClose: () => void;
  onChanged: () => Promise<void>;
};

const analyticsStatusLabel = {
  PENDING: "Chờ mapping",
  PARTIAL: "Đã map một phần",
  LINKED: "Đã liên kết",
  AMBIGUOUS: "Cần đối chiếu",
  FAILED: "Lỗi mapping",
};

function MappingRow({
  item,
  onSaved,
}: {
  item: MappingReviewItem;
  onSaved: () => Promise<void>;
}) {
  const [namespace, setNamespace] =
    useState<PublicationAliasNamespace>("FACEBOOK_GRAPH_REEL");
  const [externalId, setExternalId] = useState("");
  const [permalink, setPermalink] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/mapping-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptId: item.receipt.id,
          namespace,
          externalId,
          permalink: permalink || undefined,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Không thể lưu mapping");
      }
      setExternalId("");
      setPermalink("");
      setMessage("Đã lưu ID analytics.");
      await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu mapping");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="mapping-card">
      <div className="mapping-card-head">
        <div>
          <span className="channel-tag">{item.channelCode}</span>
          <h3>{item.title}</h3>
          <p>{item.contentId}</p>
        </div>
        <span
          className={`mapping-status mapping-${item.receipt.analyticsLinkStatus.toLowerCase()}`}
        >
          {analyticsStatusLabel[item.receipt.analyticsLinkStatus]}
        </span>
      </div>

      <div className="receipt-id-line">
        <span>Meta Business content_id</span>
        <code>{item.receipt.metaContentId}</code>
        <a href={item.receipt.sourceUrl} target="_blank" rel="noreferrer">
          Mở Insights ↗
        </a>
      </div>

      {item.receipt.aliases.length > 1 && (
        <div className="alias-list">
          {item.receipt.aliases
            .filter((alias) => alias.namespace !== "META_BUSINESS_CONTENT")
            .map((alias) => (
              <span key={alias.namespace}>
                {alias.namespace === "FACEBOOK_GRAPH_REEL"
                  ? "Facebook Graph"
                  : "Instagram Media"}
                : <code>{alias.externalId}</code>
              </span>
            ))}
        </div>
      )}

      <div className="mapping-form">
        <label>
          Loại ID
          <select
            value={namespace}
            onChange={(event) =>
              setNamespace(event.target.value as PublicationAliasNamespace)
            }
          >
            <option value="FACEBOOK_GRAPH_REEL">Facebook Graph Reel ID</option>
            <option value="INSTAGRAM_MEDIA">Instagram Media ID</option>
          </select>
        </label>
        <label>
          ID analytics
          <input
            inputMode="numeric"
            value={externalId}
            onChange={(event) =>
              setExternalId(event.target.value.replace(/\D/g, ""))
            }
            placeholder="Chỉ nhập dãy số"
          />
        </label>
        <label>
          Permalink (không bắt buộc)
          <input
            type="url"
            value={permalink}
            onChange={(event) => setPermalink(event.target.value)}
            placeholder="https://..."
          />
        </label>
        <button
          className="button button-primary"
          disabled={busy || externalId.length < 6}
          onClick={save}
        >
          {busy ? "Đang lưu…" : "Liên kết ID"}
        </button>
      </div>
      {message && (
        <p className="form-feedback" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </article>
  );
}

export function MappingReviewPanel({
  onClose,
  onChanged,
}: MappingReviewPanelProps) {
  const [items, setItems] = useState<MappingReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/mapping-review", {
        cache: "no-store",
      });
      const payload = (await response.json()) as MappingReviewResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Không thể tải mapping");
      }
      setItems(payload.items);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Không thể tải mapping",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function refreshAll() {
    await Promise.all([load(), onChanged()]);
  }

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="drawer mapping-drawer"
        onMouseDown={(event) => event.stopPropagation()}
        aria-label="Đối chiếu ID analytics Meta"
        aria-modal="true"
        role="dialog"
      >
        <div className="drawer-head">
          <div>
            <p className="eyebrow">ADMIN · META ANALYTICS</p>
            <h2>Mapping Review Queue</h2>
            <p>
              Đối chiếu ID analytics mà không thay đổi trạng thái đăng bài.
            </p>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Đóng Mapping Review Queue"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        {loading ? (
          <div className="empty-state">
            <span className="loading-ring" />
            <span>Đang tải receipt cần đối chiếu…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <strong>Không có receipt cần xử lý</strong>
            <span>Tất cả bài Meta hiện đã liên kết đủ ID analytics.</span>
          </div>
        ) : (
          <div className="mapping-list">
            {items.map((item) => (
              <MappingRow
                key={item.receipt.id}
                item={item}
                onSaved={refreshAll}
              />
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
