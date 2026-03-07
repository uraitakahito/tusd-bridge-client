import type { IntlShape } from "@formatjs/intl";
import type { FilesState } from "./files-state";
import type { FileInfo } from "./types";

interface FilesViewProps {
  loadingVisible: boolean;
  connectionBadge: {
    hidden: boolean;
    kind: "connected" | "reconnecting" | "disconnected";
  };
  files: FileInfo[] | null;
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
): FilesUI {
  // Title
  const title = document.createElement("h1");
  title.textContent = intl.formatMessage({ id: "files.title" });

  // Connection status badge
  const connectionStatus = document.createElement("div");
  connectionStatus.className = "connection-status";

  // Loading indicator
  const loadingIndicator = document.createElement("p");
  loadingIndicator.className = "loading-indicator";
  loadingIndicator.textContent = intl.formatMessage({ id: "files.loading" });

  // File list table
  const table = document.createElement("table");
  table.className = "file-list";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const columns = [
    "files.column.id",
    "files.column.filename",
    "files.column.size",
    "files.column.status",
    "files.column.progress",
    "files.column.updatedAt",
    "files.column.download",
  ];
  for (const col of columns) {
    const th = document.createElement("th");
    th.textContent = intl.formatMessage({ id: col });
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  // Empty message
  const emptyMessage = document.createElement("p");
  emptyMessage.className = "empty-message";
  emptyMessage.textContent = intl.formatMessage({ id: "files.empty" });
  emptyMessage.hidden = true;

  // Error message
  const errorMessage = document.createElement("p");
  errorMessage.className = "error-message";
  errorMessage.hidden = true;

  // Retry button
  const retryButton = document.createElement("button");
  retryButton.textContent = intl.formatMessage({ id: "files.retry" });
  retryButton.className = "retry-button";
  retryButton.hidden = true;

  root.appendChild(title);
  root.appendChild(connectionStatus);
  root.appendChild(loadingIndicator);
  root.appendChild(table);
  root.appendChild(emptyMessage);
  root.appendChild(errorMessage);
  root.appendChild(retryButton);

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

  function renderFileRow(file: FileInfo): HTMLTableRowElement {
    const row = document.createElement("tr");

    const idCell = document.createElement("td");
    idCell.textContent = file.upload_id;
    idCell.className = "file-id";
    row.appendChild(idCell);

    const nameCell = document.createElement("td");
    nameCell.textContent = file.filename ?? noFilename;
    row.appendChild(nameCell);

    const sizeCell = document.createElement("td");
    sizeCell.textContent =
      file.file_size != null
        ? intl.formatNumber(file.file_size)
        : "-";
    row.appendChild(sizeCell);

    const statusCell = document.createElement("td");
    statusCell.textContent = file.display_status;
    statusCell.className = `status-${file.display_status}`;
    row.appendChild(statusCell);

    const progressCell = document.createElement("td");
    if (file.file_offset != null && file.file_size != null && file.file_size > 0) {
      const pct = (file.file_offset / file.file_size * 100).toFixed(1);
      progressCell.textContent = `${pct}%`;
    } else {
      progressCell.textContent = "-";
    }
    row.appendChild(progressCell);

    const dateCell = document.createElement("td");
    dateCell.textContent = file.updated_at.replace("T", " ").slice(0, 19);
    row.appendChild(dateCell);

    const downloadCell = document.createElement("td");
    const downloadLink = document.createElement("a");
    downloadLink.href = file.download_url;
    downloadLink.textContent = intl.formatMessage({ id: "files.downloadLink" });
    downloadLink.download = "";
    downloadCell.appendChild(downloadLink);
    row.appendChild(downloadCell);

    return row;
  }

  function renderFiles(files: FileInfo[]): void {
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
