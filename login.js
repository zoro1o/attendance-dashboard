/* ============================================================
   login.js — Client-side authentication
   ============================================================ */

const ALLOWED_EMAILS  = [];   // empty = any Gmail allowed
const CORRECT_PASSWORD = "ADMIN";

// Inject shake keyframe early
const _s = document.createElement("style");
_s.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`;
document.head.appendChild(_s);

// If already logged in, skip straight to dashboard
if (sessionStorage.getItem("att_auth") === "true") {
  window.location.replace("dashboard.html");
}

document.addEventListener("DOMContentLoaded", () => {
  const form     = document.getElementById("loginForm");
  const emailEl  = document.getElementById("email");
  const passEl   = document.getElementById("password");
  const errBox   = document.getElementById("errorBox");
  const errMsg   = document.getElementById("errorMsg");
  const loginBtn = document.getElementById("loginBtn");
  const btnText  = loginBtn.querySelector(".btn-text");
  const loader   = document.getElementById("btnLoader");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const email    = emailEl.value.trim().toLowerCase();
    const password = passEl.value;

    clearError();

    if (!email.endsWith("@gmail.com")) {
      showError("Please use a Gmail address (must end in @gmail.com).");
      emailEl.focus();
      return;
    }

    if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.map(x => x.toLowerCase()).includes(email)) {
      showError("This Gmail address is not authorised.");
      emailEl.focus();
      return;
    }

    if (password !== CORRECT_PASSWORD) {
      showError("Incorrect password. Please try again.");
      passEl.value = "";
      passEl.focus();
      return;
    }

    setLoading(true);
    sessionStorage.setItem("att_auth", "true");
    sessionStorage.setItem("att_email", email);
    setTimeout(() => { window.location.href = "dashboard.html"; }, 600);
  });

  function showError(msg) {
    errMsg.textContent = msg;
    errBox.classList.add("visible");
    errBox.style.animation = "none";
    void errBox.offsetHeight;
    errBox.style.animation = "shake 0.35s ease";
  }

  function clearError() {
    errBox.classList.remove("visible");
    errMsg.textContent = "";
  }

  function setLoading(on) {
    loginBtn.disabled = on;
    btnText.textContent = on ? "Signing in…" : "Sign In";
    loader.classList.toggle("visible", on);
  }

  // expose togglePw globally for the inline onclick
  window.togglePw = function () {
    const isText = passEl.type === "text";
    passEl.type = isText ? "password" : "text";
    document.getElementById("eyeIcon").innerHTML = isText
      ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`
      : `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
  };
});
