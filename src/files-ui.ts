import type { IntlShape } from "@formatjs/intl";
import type { FilesState } from "./files-state";
import type { FileInfo } from "./types";

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
    "files.column.filename",
    "files.column.size",
    "files.column.status",
    "files.column.updatedAt",
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

  const noFilename = intl.formatMessage({ id: "files.noFilename" });

  function renderFileRow(file: FileInfo): HTMLTableRowElement {
    const row = document.createElement("tr");

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

    const dateCell = document.createElement("td");
    dateCell.textContent = file.updated_at.replace("T", " ").slice(0, 19);
    row.appendChild(dateCell);

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

  return {
    retryButton,

    render(state: FilesState) {
      switch (state.kind) {
        case "loading":
          loadingIndicator.hidden = false;
          table.hidden = true;
          emptyMessage.hidden = true;
          connectionStatus.hidden = true;
          errorMessage.hidden = true;
          retryButton.hidden = true;
          break;

        case "connected":
          loadingIndicator.hidden = true;
          connectionStatus.hidden = false;
          setConnectionBadge("connected");
          renderFiles(state.files);
          errorMessage.hidden = true;
          retryButton.hidden = true;
          break;

        case "reconnecting":
          loadingIndicator.hidden = true;
          connectionStatus.hidden = false;
          setConnectionBadge("reconnecting");
          errorMessage.hidden = true;
          retryButton.hidden = true;
          break;

        case "error":
          loadingIndicator.hidden = true;
          connectionStatus.hidden = false;
          setConnectionBadge("disconnected");
          if (state.files.length > 0) {
            renderFiles(state.files);
          }
          errorMessage.textContent = intl.formatMessage(
            { id: "files.error" },
            { message: state.message },
          );
          errorMessage.hidden = false;
          retryButton.hidden = false;
          break;
      }
    },
  };
}
