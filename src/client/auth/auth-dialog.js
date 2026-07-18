import { ApiError } from "../services/api.js";

export function createAuthController(api, elements) {
  let session = null;
  let pendingResolve = null;

  elements.form.addEventListener("submit", submit);
  elements.close.addEventListener("click", close);
  elements.show.addEventListener("click", togglePassword);
  elements.dialog.addEventListener("close", resolveCancelled);

  return {
    async ensureAuthenticated() {
      session = await api.getSession();
      if (session.authenticated) return session;
      return open();
    },
    getSession: () => session,
    async logout() {
      if (!session) session = await api.getSession();
      if (session.authenticated) await api.logout(session.csrfToken);
      session = null;
    },
  };

  function open() {
    elements.error.hidden = true;
    elements.input.value = "";
    elements.dialog.showModal();
    elements.input.focus();
    return new Promise((resolve) => { pendingResolve = resolve; });
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      session = await api.login(elements.input.value, session.csrfToken);
      const resolve = pendingResolve;
      pendingResolve = null;
      elements.dialog.close("success");
      resolve?.(session);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  function showError(error) {
    const locked = error instanceof ApiError && error.code === "login_locked";
    const seconds = error.details?.retryAfterSeconds;
    elements.error.textContent = locked
      ? `Muitas tentativas. Tente novamente em ${formatWait(seconds)}.`
      : "Senha incorreta. Tente novamente.";
    elements.error.hidden = false;
    elements.input.select();
  }

  function setBusy(busy) {
    elements.form.querySelector(".unlock-button").disabled = busy;
    elements.input.disabled = busy;
  }

  function close() {
    elements.dialog.close("cancel");
  }

  function resolveCancelled() {
    if (elements.dialog.returnValue === "success") return;
    pendingResolve?.(null);
    pendingResolve = null;
  }

  function togglePassword() {
    const visible = elements.input.type === "text";
    elements.input.type = visible ? "password" : "text";
    elements.show.textContent = visible ? "Mostrar" : "Ocultar";
  }
}

function formatWait(seconds = 1) {
  const minutes = Math.ceil(seconds / 60);
  return minutes > 1 ? `${minutes} minutos` : `${Math.max(1, seconds)} segundos`;
}
