import { dom } from "./dom.js";
import { state } from "./state.js";

import {
  setStatus,
  clearStatus,
  revokeUrl,
} from "./utils.js";

import {
  updateAvatarView,
  previewAvatarBlob,
} from "./avatarView.js";

const ALLOWED_IMAGE_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

const MAX_IMAGE_SIZE =
  4 * 1024 * 1024;

export function destroyCropper() {
  if (!state.cropper) {
    return;
  }

  state.cropper.destroy();
  state.cropper = null;
}

function resetApplyButton() {
  dom.cropApplyButton.disabled =
    false;

  dom.cropApplyButton.innerHTML =
    '<i class="fas fa-check"></i> Use this crop';
}

export function closeCropper({
  clearSelection = false,

  restoreAvatar = false,
} = {}) {
  destroyCropper();

  dom.cropModal.hidden = true;

  document.body.classList.remove(
    "modal-open"
  );

  dom.cropImage.removeAttribute(
    "src"
  );

  revokeUrl(
    state.selectedSourceUrl
  );

  state.selectedSourceUrl = null;

  if (clearSelection) {
    dom.avatarInput.value = "";

    dom.filePickerText.innerText =
      "Choose and crop an image";
  }

  if (
    restoreAvatar &&
    state.currentProfile
  ) {
    updateAvatarView(
      state.currentProfile
    );
  }
}

function validateImage(file) {
  if (
    !ALLOWED_IMAGE_TYPES.has(
      file.type
    )
  ) {
    throw new Error(
      "Only JPEG, PNG and WebP images are allowed."
    );
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(
      "The image cannot be larger than 4 MB."
    );
  }
}

export function openCropper(file) {
  clearStatus("avatar-status");

  try {
    validateImage(file);
  } catch (error) {
    setStatus(
      "avatar-status",
      error.message,
      "error"
    );

    dom.avatarInput.value = "";

    return;
  }

  if (!window.Cropper) {
    setStatus(
      "avatar-status",
      "The image editor could not load.",
      "error"
    );

    return;
  }

  revokeUrl(
    state.croppedPreviewUrl
  );

  state.croppedPreviewUrl = null;

  state.croppedAvatarBlob = null;

  revokeUrl(
    state.selectedSourceUrl
  );

  state.selectedSourceUrl =
    URL.createObjectURL(file);

  dom.cropModal.hidden = false;

  document.body.classList.add(
    "modal-open"
  );

  dom.cropImage.onload = () => {
    destroyCropper();

    state.cropper =
      new window.Cropper(
        dom.cropImage,
        {
          aspectRatio: 1,

          viewMode: 1,

          dragMode: "move",

          autoCropArea: 0.92,

          responsive: true,

          background: false,

          movable: true,

          rotatable: true,

          zoomable: true,

          zoomOnTouch: true,

          zoomOnWheel: true,

          cropBoxMovable: true,

          cropBoxResizable: true,

          preview:
            "#crop-preview",
        }
      );
  };

  dom.cropImage.src =
    state.selectedSourceUrl;
}

function cancelCrop() {
  state.croppedAvatarBlob = null;

  closeCropper({
    clearSelection: true,
    restoreAvatar: true,
  });
}

function applyCrop() {
  if (!state.cropper) {
    return;
  }

  dom.cropApplyButton.disabled =
    true;

  dom.cropApplyButton.innerText =
    "Preparing...";

  const canvas =
    state.cropper.getCroppedCanvas({
      width: 512,
      height: 512,

      imageSmoothingEnabled:
        true,

      imageSmoothingQuality:
        "high",

      fillColor: "#ffffff",
    });

  canvas.toBlob(
    (blob) => {
      resetApplyButton();

      if (!blob) {
        setStatus(
          "avatar-status",
          "Unable to prepare the cropped image.",
          "error"
        );

        return;
      }

      state.croppedAvatarBlob =
        blob;

      previewAvatarBlob(blob);

      dom.filePickerText.innerText =
        "Cropped image ready";

      closeCropper();
    },

    "image/jpeg",

    0.92
  );
}

export function bindCropperControls() {
  dom.cropZoomIn.addEventListener(
    "click",
    () => {
      state.cropper?.zoom(0.1);
    }
  );

  dom.cropZoomOut.addEventListener(
    "click",
    () => {
      state.cropper?.zoom(-0.1);
    }
  );

  dom.cropRotateLeft.addEventListener(
    "click",
    () => {
      state.cropper?.rotate(-90);
    }
  );

  dom.cropRotateRight.addEventListener(
    "click",
    () => {
      state.cropper?.rotate(90);
    }
  );

  dom.cropReset.addEventListener(
    "click",
    () => {
      state.cropper?.reset();
    }
  );

  dom.cropApplyButton.addEventListener(
    "click",
    applyCrop
  );

  dom.cropCloseButton.addEventListener(
    "click",
    cancelCrop
  );

  dom.cropCancelButton.addEventListener(
    "click",
    cancelCrop
  );

  dom.cropModalBackdrop
    .addEventListener(
      "click",
      cancelCrop
    );

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        !dom.cropModal.hidden
      ) {
        cancelCrop();
      }
    }
  );
}

export function cleanCropperResources() {
  destroyCropper();

  revokeUrl(
    state.selectedSourceUrl
  );

  revokeUrl(
    state.croppedPreviewUrl
  );
}