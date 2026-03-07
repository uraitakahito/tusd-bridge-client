import type { FilesState, FilesEvent, FilesTransitionResult } from "./files-state";
import { transition } from "./files-state";
import { createFilesUI } from "./files-ui";
import { createFilesChannel } from "./files-channel";
import { setupIntl } from "./i18n";
import filesEn from "./locales/files.en.json";
import filesJa from "./locales/files.ja.json";
import { config } from "./config";

const intl = setupIntl({ en: filesEn, ja: filesJa });

const root = document.getElementById("app")!;
const ui = createFilesUI(root, intl);

let state: FilesState = { kind: "loading" };

function dispatch(event: FilesEvent): FilesTransitionResult {
  const result: FilesTransitionResult = transition(state, event);
  if (!result.ok) {
    console.warn(
      `Invalid transition: event "${result.eventType}" in state "${result.from}"`,
    );
  }
  state = result.state;
  ui.render(state);
  return result;
}

const channel = createFilesChannel(config.filesApiBaseUrl, dispatch);

ui.retryButton.addEventListener("click", () => {
  const result = dispatch({ type: "RETRY" });
  if (!result.ok) return;
  void channel.subscribe();
});

ui.render(state);
void channel.subscribe();
