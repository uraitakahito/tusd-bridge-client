import type { UploadState, UploadEvent } from "./upload-state";
import { transition } from "./upload-state";
import { createUI } from "./upload-ui";
import { createUploader } from "./upload-client";
import { createDispatch } from "./fsm";
import { setupIntl } from "./i18n";
import uploadEn from "./locales/upload.en.json";
import uploadJa from "./locales/upload.ja.json";
import type { IntlShape } from "./i18n";
import { config } from "./config";

function validateGlbFile(file: File, intl: IntlShape<string>): string | null {
  if (!file.name.toLowerCase().endsWith(".glb")) {
    return intl.formatMessage({ id: "validation.notGlb" }, { name: file.name });
  }
  return null;
}

const intl = setupIntl({ en: uploadEn, ja: uploadJa });

const root = document.getElementById("app")!;
const ui = createUI(root, intl);
ui.endpointInput.value = config.tusEndpoint;

const { dispatch, getState } = createDispatch<UploadState, UploadEvent>(
  { kind: "idle" },
  transition,
  (s) => ui.render(s),
);

const uploader = createUploader(dispatch, (statusCode) =>
  statusCode > 0
    ? intl.formatMessage({ id: "error.httpStatus" }, { statusCode })
    : intl.formatMessage({ id: "error.networkError" }),
);

ui.fileInput.addEventListener("click", () => {
  if (getState().kind === "success" || getState().kind === "error") {
    dispatch({ type: "RESET" });
  }
});

ui.fileInput.addEventListener("change", () => {
  if (getState().kind === "uploading" || getState().kind === "retrying") {
    uploader.abortUpload();
    dispatch({ type: "PAUSE" });
  }
  dispatch({ type: "RESET" });
});

ui.uploadButton.addEventListener("click", () => {
  const file = ui.fileInput.files?.[0];
  if (!file) return;

  const chunkSize = Number(ui.chunkSizeInput.value) || Infinity;

  const eventType = getState().kind === "success" || getState().kind === "error"
    ? "RESTART" : "START";
  const result = dispatch({ type: eventType });
  if (!result.ok) return;

  const validationError = validateGlbFile(file, intl);
  if (validationError) {
    dispatch({ type: "VALIDATION_ERROR", message: validationError });
    return;
  }

  const validatedResult = dispatch({ type: "VALIDATED" });
  if (!validatedResult.ok) return;
  uploader.startUpload({
    file,
    endpoint: ui.endpointInput.value,
    token: ui.tokenInput.value,
    chunkSize,
  });
});

ui.pauseButton.addEventListener("click", () => {
  if (getState().kind === "uploading" || getState().kind === "retrying") {
    uploader.abortUpload();
    const result = dispatch({ type: "PAUSE" });
    if (!result.ok) uploader.retryUpload();
  } else if (getState().kind === "paused") {
    const result = dispatch({ type: "RESUME" });
    if (!result.ok) return;
    uploader.retryUpload();
  }
});

ui.cancelButton.addEventListener("click", () => {
  const result = dispatch({ type: "CANCEL" });
  if (result.ok) {
    uploader.abortUpload(true);
  }
});

ui.manualRetryButton.addEventListener("click", () => {
  const result = dispatch({ type: "MANUAL_RETRY" });
  if (!result.ok) return;
  uploader.retryUpload();
});
