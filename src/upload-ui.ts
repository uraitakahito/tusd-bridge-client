import type { IntlShape } from "@formatjs/intl";
import type { UploadState } from "./upload-state";
import { h } from "./dom";

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
  const endpointInput = h("input", { type: "text", class: "endpoint-input" });
  const endpointLabel = h("label", { class: "endpoint-label" },
    intl.formatMessage({ id: "label.endpoint" }), endpointInput,
  );

  // Token input
  //
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
  //   const hdr = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  //   const p = Buffer.from(JSON.stringify({sub:'user001'})).toString('base64url');
  //   const s = crypto.createHmac('sha256',secret).update(hdr+'.'+p).digest('base64url');
  //   console.log(hdr+'.'+p+'.'+s);
  //   "
  //
  // Server-side verification (Node.js):
  //   const [header, payload, sig] = token.split(".");
  //   const expected = crypto.createHmac("sha256", SECRET)
  //     .update(header + "." + payload).digest("base64url");
  //   if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
  //     throw new Error("invalid signature");
  //   const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  const tokenInput = h("input", {
    type: "text",
    class: "token-input",
    value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMDAxIn0.B9OtmBkfpQ1UM2Wp94-aQGOu7qAiRWGpAMejfdCy8fU",
    readOnly: true,
    disabled: true,
  });
  const tokenLabel = h("label", { class: "token-label" },
    intl.formatMessage({ id: "label.token" }), tokenInput,
  );

  // Chunk size input
  const chunkSizeInput = h("input", {
    type: "number",
    class: "chunk-size-input",
    placeholder: intl.formatMessage({ id: "placeholder.chunkSize" }),
  });
  const chunkSizeLabel = h("label", { class: "chunk-size-label" },
    intl.formatMessage({ id: "label.chunkSize" }), chunkSizeInput,
  );

  // File input
  const fileInput = h("input", { type: "file", accept: ".glb" });

  // Buttons
  const uploadButton = h("button", { disabled: true },
    intl.formatMessage({ id: "button.upload" }));
  const pauseButton = h("button", { hidden: true },
    intl.formatMessage({ id: "button.pause" }));
  const cancelButton = h("button", { hidden: true },
    intl.formatMessage({ id: "button.cancel" }));

  // Progress bar
  const progressBar = h("div", { class: "progress-bar" });
  const progressContainer = h("div", { class: "progress-container" }, progressBar);

  // Status
  const status = h("p");

  // Retry panel
  const retryMessage = h("p");
  const retryCountLabel = h("span", { class: "retry-count" });
  const manualRetryButton = h("button", { hidden: true },
    intl.formatMessage({ id: "button.manualRetry" }));
  const retryPanel = h("div", { class: "retry-panel", hidden: true },
    retryMessage, retryCountLabel, manualRetryButton,
  );

  root.append(
    endpointLabel, tokenLabel, chunkSizeLabel,
    fileInput, uploadButton, pauseButton, cancelButton,
    progressContainer, status, retryPanel,
  );

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
      case "validating":
        return {
          inputsDisabled: true,
          uploadButtonDisabled: true,
          pauseButton: { hidden: true, text: intl.formatMessage({ id: "button.pause" }) },
          cancelHidden: true,
          retryPanel: {
            hidden: true, message: "", countLabel: "",
            manualRetryButton: { hidden: true, disabled: true },
          },
          progress: { visible: false, width: "0%", modifier: null },
          statusText: intl.formatMessage({ id: "status.validating" }),
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
