import type { IntlShape } from "@formatjs/intl";
import type { FilesState } from "./files-state";
import type { UploadRecord } from "./types";
import { h } from "./dom";

interface FilesViewProps {
  loadingVisible: boolean;
  connectionBadge: {
    hidden: boolean;
    kind: "connected" | "reconnecting" | "disconnected";
  };
  files: UploadRecord[] | null;
  error: { hidden: boolean; message: string };
  retryHidden: boolean;
}

export interface FilesUI {
  retryButton: HTMLButtonElement;
  render(state: FilesState): void;
}

export function createFilesUI(
  root: HTMLElement,
  intl: IntlShape<string>,
  baseUrl: string,
): FilesUI {
  // Connection status badge
  const connectionStatus = h("div", { class: "connection-status" });

  // Loading indicator
  const loadingIndicator = h("p", { class: "loading-indicator" },
    intl.formatMessage({ id: "files.loading" }));

  // File list table
  const columns = [
    "files.column.id",
    "files.column.filename",
    "files.column.size",
    "files.column.status",
    "files.column.progress",
    "files.column.updatedAt",
    "files.column.download",
    "files.column.rerun",
  ];
  const tbody = h("tbody");
  const table = h("table", { class: "file-list" },
    h("thead", null,
      h("tr", null, ...columns.map((col) =>
        h("th", null, intl.formatMessage({ id: col })))),
    ),
    tbody,
  );

  // Empty message
  const emptyMessage = h("p", { class: "empty-message", hidden: true },
    intl.formatMessage({ id: "files.empty" }));

  // Error message
  const errorMessage = h("p", { class: "error-message", hidden: true });

  // Retry button
  const retryButton = h("button", { class: "retry-button", hidden: true },
    intl.formatMessage({ id: "files.retry" }));

  root.append(
    h("h1", null, intl.formatMessage({ id: "files.title" })),
    connectionStatus, loadingIndicator, table,
    emptyMessage, errorMessage, retryButton,
  );

  function deriveViewProps(state: FilesState): FilesViewProps {
    switch (state.kind) {
      case "loading":
        return {
          loadingVisible: true,
          connectionBadge: { hidden: true, kind: "disconnected" },
          files: [],
          error: { hidden: true, message: "" },
          retryHidden: true,
        };
      case "connected":
        return {
          loadingVisible: false,
          connectionBadge: { hidden: false, kind: "connected" },
          files: state.files,
          error: { hidden: true, message: "" },
          retryHidden: true,
        };
      case "reconnecting":
        return {
          loadingVisible: false,
          connectionBadge: { hidden: false, kind: "reconnecting" },
          files: null,
          error: { hidden: true, message: "" },
          retryHidden: true,
        };
      case "error":
        return {
          loadingVisible: false,
          connectionBadge: { hidden: false, kind: "disconnected" },
          files: state.files,
          error: {
            hidden: false,
            message: intl.formatMessage({ id: "files.error" }, { message: state.message }),
          },
          retryHidden: false,
        };
    }
  }

  const noFilename = intl.formatMessage({ id: "files.noFilename" });

  function renderFileRow(file: UploadRecord): HTMLTableRowElement {
    const orig = file.files.find((f) => f.role === "original");
    const size = orig?.size;
    const pct = (file.file_offset != null && size != null && size > 0)
      ? `${(file.file_offset / size * 100).toFixed(1)}%` : "-";

    const rerunBtn = h("button", {
      class: "rerun-button",
      disabled: file.display_status !== "failed" && file.display_status !== "processed",
    }, intl.formatMessage({ id: "files.rerun" }));

    rerunBtn.addEventListener("click", () => {
      rerunBtn.disabled = true;
      fetch(`${baseUrl}/files/${file.upload_id}/rerun`, {
        method: "POST",
      }).then((res) => {
        if (!res.ok) {
          rerunBtn.disabled = false;
          alert(intl.formatMessage({ id: "files.rerunError" }));
        }
      }).catch(() => {
        rerunBtn.disabled = false;
        alert(intl.formatMessage({ id: "files.rerunError" }));
      });
    });

    const converted = file.files.find((f) => f.role === "converted");

    const downloadLinks: (Node | string)[] = [];
    if (orig?.url) {
      downloadLinks.push(
        h("a", { href: orig.url, download: "" },
          intl.formatMessage({ id: "files.downloadLink.glb" })),
      );
    }
    if (converted?.url) {
      const convertedUrl = converted.url;
      const stlFilename = orig?.filename.replace(/\.glb$/i, ".stl") ?? converted.filename;
      const stlLink = h("a", { href: convertedUrl, download: stlFilename },
        intl.formatMessage({ id: "files.downloadLink.stl" }));
      // 変換後ファイル（STL）の URL はクロスオリジンのため、
      // <a download="…"> のファイル名指定がブラウザに無視され、
      // URL パス末尾のハッシュ値がそのままファイル名になってしまう。
      // fetch → Blob URL に変換することで同一オリジン扱いとなり、
      // download 属性のファイル名が正しく適用される。
      //
      // TODO: STL の配信を nginx リバースプロキシ経由などで同一オリジンにすれば、
      // GLB と同様に <a download="…"> だけでファイル名を制御でき、
      // この fetch → Blob URL の変換処理は不要になる。
      stlLink.addEventListener("click", (e) => {
        e.preventDefault();
        void fetch(convertedUrl)
          .then((res) => res.blob())
          .then((blob) => {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = stlFilename;
            a.click();
            URL.revokeObjectURL(blobUrl);
          });
      });
      downloadLinks.push(stlLink);
    }
    const downloadCell = downloadLinks.length > 0
      ? h("span", { class: "download-links" }, ...downloadLinks)
      : "-";

    return h("tr", null,
      h("td", { class: "file-id" }, file.upload_id),
      h("td", null, orig?.filename ?? noFilename),
      h("td", null, size != null ? intl.formatNumber(size) : "-"),
      h("td", { class: `status-${file.display_status}` }, file.display_status),
      h("td", null, pct),
      h("td", null, file.updated_at.replace("T", " ").slice(0, 19)),
      h("td", null, downloadCell),
      h("td", null, rerunBtn),
    );
  }

  function renderFiles(files: UploadRecord[]): void {
    tbody.innerHTML = "";
    for (const file of files) {
      tbody.appendChild(renderFileRow(file));
    }
    table.hidden = files.length === 0;
    emptyMessage.hidden = files.length > 0;
  }

  function setConnectionBadge(kind: "connected" | "reconnecting" | "disconnected"): void {
    connectionStatus.className = `connection-status ${kind}`;
    switch (kind) {
      case "connected":
        connectionStatus.textContent = intl.formatMessage({ id: "files.connection.connected" });
        break;
      case "reconnecting":
        connectionStatus.textContent = intl.formatMessage({ id: "files.connection.reconnecting" });
        break;
      case "disconnected":
        connectionStatus.textContent = intl.formatMessage({ id: "files.connection.disconnected" });
        break;
    }
  }

  function applyViewProps(props: FilesViewProps): void {
    loadingIndicator.hidden = !props.loadingVisible;
    connectionStatus.hidden = props.connectionBadge.hidden;
    if (!props.connectionBadge.hidden) {
      setConnectionBadge(props.connectionBadge.kind);
    }
    if (props.files != null) {
      renderFiles(props.files);
    }
    errorMessage.textContent = props.error.message;
    errorMessage.hidden = props.error.hidden;
    retryButton.hidden = props.retryHidden;
  }

  return {
    retryButton,

    render(state: FilesState) {
      applyViewProps(deriveViewProps(state));
    },
  };
}
