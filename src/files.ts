import type { FilesState, FilesEvent } from "./files-state";
import { transition } from "./files-state";
import { createFilesUI } from "./files-ui";
import { createFilesChannel } from "./files-channel";
import { createDispatch } from "./fsm";
import { setupIntl } from "./i18n";
import filesEn from "./locales/files.en.json";
import filesJa from "./locales/files.ja.json";
import { config } from "./config";

const intl = setupIntl({ en: filesEn, ja: filesJa });

const root = document.getElementById("app")!;
const ui = createFilesUI(root, intl);

const { dispatch, getState } = createDispatch<FilesState, FilesEvent>(
  { kind: "loading" },
  transition,
  (s) => ui.render(s),
);

const channel = createFilesChannel(config.filesApiBaseUrl, dispatch);

ui.retryButton.addEventListener("click", () => {
  const result = dispatch({ type: "RETRY" });
  if (!result.ok) return;
  void channel.subscribe();
});

ui.render(getState());
void channel.subscribe();
