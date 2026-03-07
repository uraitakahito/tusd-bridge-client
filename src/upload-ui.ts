import type { IntlShape } from "@formatjs/intl";
import type { UploadState } from "./upload-state";

export interface UI {
  endpointInput: HTMLInputElement;
  tokenInput: HTMLInputElement;
  chunkSizeInput: HTMLInputElement;
  fileInput: HTMLInputElement;
  uploadButton: HTMLButtonElement;
  pauseButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  manualRetryButton: HTMLButtonElement;
  render(state: UploadState): void;
}

export function createUI(root: HTMLElement, intl: IntlShape<string>): UI {
  // Endpoint input
  const endpointLabel = document.createElement("label");
  endpointLabel.textContent = intl.formatMessage({ id: "label.endpoint" });
  endpointLabel.className = "endpoint-label";
  const endpointInput = document.createElement("input");
  endpointInput.type = "text";
  endpointInput.value = "";
  endpointInput.className = "endpoint-input";
  endpointLabel.appendChild(endpointInput);

  // Token input
  const tokenLabel = document.createElement("label");
  tokenLabel.textContent = intl.formatMessage({ id: "label.token" });
  tokenLabel.className = "token-label";
  const tokenInput = document.createElement("input");
  tokenInput.type = "text";
  // Development JWT — signed with HS256, verifiable by the server.
  //
  // Secret : "dev-secret-do-not-use-in-production"
  // Header : {"alg":"HS256","typ":"JWT"}
  // Payload: {"sub":"user001"}
  //
  // Signature generation:
  //   1. Base64url-encode the header and payload JSON strings.
  //   2. Concatenate them with "." → "<header>.<payload>".
  //   3. Compute HMAC-SHA256 of the concatenated string using the secret.
  //   4. Base64url-encode the HMAC digest → this becomes the signature.
  //
  // To regenerate this token:
  //   node -e "
  //   const crypto = require('crypto');
  //   const secret = 'dev-secret-do-not-use-in-production';
  //   const h = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  //   const p = Buffer.from(JSON.stringify({sub:'user001'})).toString('base64url');
  //   const s = crypto.createHmac('sha256',secret).update(h+'.'+p).digest('base64url');
  //   console.log(h+'.'+p+'.'+s);
  //   "
  //
  // Server-side verification (Node.js):
  //   const [header, payload, sig] = token.split(".");
  //   const expected = crypto.createHmac("sha256", SECRET)
  //     .update(header + "." + payload).digest("base64url");
  //   if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
  //     throw new Error("invalid signature");
  //   const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  tokenInput.value =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMDAxIn0.B9OtmBkfpQ1UM2Wp94-aQGOu7qAiRWGpAMejfdCy8fU";
  tokenInput.className = "token-input";
  tokenLabel.appendChild(tokenInput);

  // Chunk size input
  const chunkSizeLabel = document.createElement("label");
  chunkSizeLabel.textContent = intl.formatMessage({ id: "label.chunkSize" });
  chunkSizeLabel.className = "chunk-size-label";
  const chunkSizeInput = document.createElement("input");
  chunkSizeInput.type = "number";
  chunkSizeInput.placeholder = intl.formatMessage({ id: "placeholder.chunkSize" });
  chunkSizeInput.className = "chunk-size-input";
  chunkSizeLabel.appendChild(chunkSizeInput);

  // File input
  const fileInput = document.createElement("input");
  fileInput.type = "file";

  // Upload button
  const uploadButton = document.createElement("button");
  uploadButton.textContent = intl.formatMessage({ id: "button.upload" });
  uploadButton.disabled = true;

  // Pause button
  const pauseButton = document.createElement("button");
  pauseButton.textContent = intl.formatMessage({ id: "button.pause" });
  pauseButton.hidden = true;

  // Cancel button
  const cancelButton = document.createElement("button");
  cancelButton.textContent = intl.formatMessage({ id: "button.cancel" });
  cancelButton.hidden = true;

  // Progress bar
  const progressContainer = document.createElement("div");
  progressContainer.className = "progress-container";
  const progressBar = document.createElement("div");
  progressBar.className = "progress-bar";
  progressContainer.appendChild(progressBar);

  // Status
  const status = document.createElement("p");

  // Retry panel
  const retryPanel = document.createElement("div");
  retryPanel.className = "retry-panel";
  retryPanel.hidden = true;

  const retryMessage = document.createElement("p");
  const retryCountLabel = document.createElement("span");
  retryCountLabel.className = "retry-count";
  const manualRetryButton = document.createElement("button");
  manualRetryButton.textContent = intl.formatMessage({ id: "button.manualRetry" });
  manualRetryButton.hidden = true;

  retryPanel.appendChild(retryMessage);
  retryPanel.appendChild(retryCountLabel);
  retryPanel.appendChild(manualRetryButton);

  root.appendChild(endpointLabel);
  root.appendChild(tokenLabel);
  root.appendChild(chunkSizeLabel);
  root.appendChild(fileInput);
  root.appendChild(uploadButton);
  root.appendChild(pauseButton);
  root.appendChild(cancelButton);
  root.appendChild(progressContainer);
  root.appendChild(status);
  root.appendChild(retryPanel);

  interface ViewProps {
    inputsDisabled: boolean;
    uploadButtonDisabled: boolean;
    pauseButton: { hidden: boolean; text: string };
    cancelHidden: boolean;
    retryPanel: {
      hidden: boolean;
      message: string;
      countLabel: string;
      manualRetryButton: { hidden: boolean; disabled: boolean };
    };
    progress: {
      visible: boolean;
      width: string;
      modifier: "retrying" | "paused" | null;
    };
    statusText: string;
  }

  function formatProgress(
    bytesUploaded: number,
    bytesTotal: number,
    msgId: string,
    noProgressMsgId: string,
  ): { width: string; statusText: string } {
    if (bytesTotal > 0) {
      const pct = ((bytesUploaded / bytesTotal) * 100).toFixed(1);
      return {
        width: `${pct}%`,
        statusText: intl.formatMessage(
          { id: msgId },
          { pct, uploaded: bytesUploaded, total: bytesTotal },
        ),
      };
    }
    return { width: "0%", statusText: intl.formatMessage({ id: noProgressMsgId }) };
  }

  function deriveViewProps(state: UploadState, fileSelected: boolean): ViewProps {
    switch (state.kind) {
      case "idle":
        return {
          inputsDisabled: false,
          uploadButtonDisabled: !fileSelected,
          pauseButton: { hidden: true, text: intl.formatMessage({ id: "button.pause" }) },
          cancelHidden: true,
          retryPanel: {
            hidden: true, message: "", countLabel: "",
            manualRetryButton: { hidden: true, disabled: true },
          },
          progress: { visible: false, width: "0%", modifier: null },
          statusText: "",
        };
      case "uploading": {
        const { width, statusText } = formatProgress(
          state.bytesUploaded, state.bytesTotal,
          "status.uploading", "status.uploadingNoProgress",
        );
        return {
          inputsDisabled: true,
          uploadButtonDisabled: true,
          pauseButton: { hidden: false, text: intl.formatMessage({ id: "button.pause" }) },
          cancelHidden: false,
          retryPanel: {
            hidden: true, message: "", countLabel: "",
            manualRetryButton: { hidden: true, disabled: true },
          },
          progress: { visible: true, width, modifier: null },
          statusText,
        };
      }
      case "retrying": {
        const { width } = formatProgress(
          state.bytesUploaded, state.bytesTotal,
          "status.uploading", "status.uploadingNoProgress",
        );
        return {
          inputsDisabled: true,
          uploadButtonDisabled: true,
          pauseButton: { hidden: false, text: intl.formatMessage({ id: "button.pause" }) },
          cancelHidden: false,
          retryPanel: {
            hidden: false,
            message: intl.formatMessage({ id: "retry.reason" }, { reason: state.reason }),
            countLabel: intl.formatMessage(
              { id: "retry.count" },
              { attempt: state.attempt + 1, max: state.maxRetries, delaySec: state.delay / 1000 },
            ),
            manualRetryButton: { hidden: true, disabled: true },
          },
          progress: { visible: true, width, modifier: "retrying" },
          statusText: "",
        };
      }
      case "paused": {
        const { width, statusText } = formatProgress(
          state.bytesUploaded, state.bytesTotal,
          "status.paused", "status.pausedNoProgress",
        );
        return {
          inputsDisabled: true,
          uploadButtonDisabled: true,
          pauseButton: { hidden: false, text: intl.formatMessage({ id: "button.resume" }) },
          cancelHidden: false,
          retryPanel: {
            hidden: true, message: "", countLabel: "",
            manualRetryButton: { hidden: true, disabled: true },
          },
          progress: { visible: true, width, modifier: "paused" },
          statusText,
        };
      }
      case "error": {
        const { width } = formatProgress(
          state.bytesUploaded, state.bytesTotal,
          "status.uploading", "status.uploadingNoProgress",
        );
        return {
          inputsDisabled: false,
          uploadButtonDisabled: !fileSelected,
          pauseButton: { hidden: true, text: intl.formatMessage({ id: "button.pause" }) },
          cancelHidden: true,
          retryPanel: {
            hidden: false,
            message: intl.formatMessage({ id: "retry.failed" }, { message: state.message }),
            countLabel: intl.formatMessage({ id: "retry.allFailed" }),
            manualRetryButton: { hidden: false, disabled: false },
          },
          progress: { visible: true, width, modifier: null },
          statusText: "",
        };
      }
      case "success":
        return {
          inputsDisabled: false,
          uploadButtonDisabled: !fileSelected,
          pauseButton: { hidden: true, text: intl.formatMessage({ id: "button.pause" }) },
          cancelHidden: true,
          retryPanel: {
            hidden: true, message: "", countLabel: "",
            manualRetryButton: { hidden: true, disabled: true },
          },
          progress: { visible: true, width: "100%", modifier: null },
          statusText: intl.formatMessage({ id: "status.complete" }, { url: state.url }),
        };
    }
  }

  function applyViewProps(props: ViewProps): void {
    endpointInput.disabled = props.inputsDisabled;
    tokenInput.disabled = props.inputsDisabled;
    chunkSizeInput.disabled = props.inputsDisabled;
    fileInput.disabled = props.inputsDisabled;
    uploadButton.disabled = props.uploadButtonDisabled;

    pauseButton.hidden = props.pauseButton.hidden;
    pauseButton.textContent = props.pauseButton.text;
    cancelButton.hidden = props.cancelHidden;

    retryPanel.hidden = props.retryPanel.hidden;
    retryMessage.textContent = props.retryPanel.message;
    retryCountLabel.textContent = props.retryPanel.countLabel;
    manualRetryButton.hidden = props.retryPanel.manualRetryButton.hidden;
    manualRetryButton.disabled = props.retryPanel.manualRetryButton.disabled;

    progressContainer.classList.toggle("visible", props.progress.visible);
    progressBar.style.width = props.progress.width;
    progressBar.classList.toggle("retrying", props.progress.modifier === "retrying");
    progressBar.classList.toggle("paused", props.progress.modifier === "paused");

    status.textContent = props.statusText;
  }

  return {
    endpointInput,
    tokenInput,
    chunkSizeInput,
    fileInput,
    uploadButton,
    pauseButton,
    cancelButton,
    manualRetryButton,

    render(state: UploadState) {
      const props = deriveViewProps(state, !!fileInput.files?.length);
      applyViewProps(props);
    },
  };
}
