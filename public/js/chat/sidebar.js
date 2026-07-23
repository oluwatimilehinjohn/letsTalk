import { dom } from "./dom.js";

export function openMembersPanel() {
  document.body.classList.add(
    "sidebar-open"
  );

  dom.membersToggle?.setAttribute(
    "aria-expanded",
    "true"
  );
}

export function closeMembersPanel() {
  document.body.classList.remove(
    "sidebar-open"
  );

  dom.membersToggle?.setAttribute(
    "aria-expanded",
    "false"
  );
}

export function bindSidebar({
  onEscape,
} = {}) {
  dom.membersToggle?.addEventListener(
    "click",
    () => {
      const isOpen =
        document.body.classList.contains(
          "sidebar-open"
        );

      if (isOpen) {
        closeMembersPanel();
        return;
      }

      openMembersPanel();
    }
  );

  dom.sidebarBackdrop
    ?.addEventListener(
      "click",
      closeMembersPanel
    );

  dom.userList.addEventListener(
    "click",
    (event) => {
      if (
        event.target.closest("a")
      ) {
        closeMembersPanel();
      }
    }
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") {
        return;
      }

      closeMembersPanel();

      if (
        typeof onEscape ===
        "function"
      ) {
        onEscape();
      }
    }
  );

  window.addEventListener(
    "resize",
    () => {
      if (window.innerWidth > 900) {
        closeMembersPanel();
      }
    }
  );
}