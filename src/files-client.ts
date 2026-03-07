import type { FilesEvent } from "./files-state";
import type { FileInfo, FilesResponse } from "./types";

export interface FilesClient {
  fetchFiles(): Promise<void>;
  disconnectSSE(): void;
}

export function createFilesClient(
  baseUrl: string,
  dispatch: (event: FilesEvent) => void,
): FilesClient {
  let eventSource: EventSource | null = null;
  let hasConnectedOnce = false;

  function startSSE(lastEventId: number): void {
    if (eventSource) {
      eventSource.close();
    }

    hasConnectedOnce = false;
    const url = `${baseUrl}/files/events?cursor=${String(lastEventId)}`;
    eventSource = new EventSource(url);

    eventSource.addEventListener("open", () => {
      if (hasConnectedOnce) {
        dispatch({ type: "SSE_RECONNECT" });
      }
      hasConnectedOnce = true;
    });

    eventSource.addEventListener(
      "file_status_changed",
      (event: MessageEvent<string>) => {
        const file = JSON.parse(event.data) as FileInfo;
        const eventId = Number(event.lastEventId);
        dispatch({ type: "FILE_EVENT", file, eventId });
      },
    );

    eventSource.addEventListener("error", () => {
      if (!eventSource) return;
      if (eventSource.readyState === EventSource.CLOSED) {
        dispatch({
          type: "RECONNECT_FAILED",
          message: "SSE connection closed",
        });
      } else if (eventSource.readyState === EventSource.CONNECTING) {
        if (hasConnectedOnce) {
          dispatch({ type: "SSE_DISCONNECT" });
        }
      }
    });
  }

  return {
    async fetchFiles() {
      try {
        const response = await fetch(`${baseUrl}/files`);
        if (!response.ok) {
          dispatch({
            type: "LOAD_ERROR",
            message: `HTTP ${String(response.status)}`,
          });
          return;
        }
        const data = (await response.json()) as FilesResponse;
        dispatch({
          type: "FILES_LOADED",
          files: data.files,
          lastEventId: data.last_event_id,
        });
        startSSE(data.last_event_id);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        dispatch({ type: "LOAD_ERROR", message });
      }
    },

    disconnectSSE() {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    },
  };
}
