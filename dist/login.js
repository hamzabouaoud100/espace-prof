if (location.protocol === "file:") {
  location.replace("http://127.0.0.1:4173/login.html");
}

const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const loginLanguage = document.querySelector("#login-language");
const passwordInput = document.querySelector("#password");
let french = document.documentElement.lang === "fr";

function loginText(arabic, frenchText) {
  return french ? frenchText : arabic;
}

loginLanguage.addEventListener("click", () => {
  french = !french;
  document.documentElement.lang = french ? "fr" : "ar";
  document.documentElement.dir = french ? "ltr" : "rtl";
  loginLanguage.textContent = french ? "العربية" : "Français";
  document.querySelectorAll("[data-ar]").forEach((element) => {
    element.textContent = element.dataset[french ? "fr" : "ar"];
  });
  loginError.textContent = "";
});

document
  .querySelector("#toggle-password")
  .addEventListener("click", (event) => {
    const visible = passwordInput.type === "password";
    passwordInput.type = visible ? "text" : "password";
    event.currentTarget.setAttribute("aria-pressed", String(visible));
    event.currentTarget.setAttribute(
      "aria-label",
      visible
        ? loginText("إخفاء كلمة المرور", "Masquer le mot de passe")
        : loginText("إظهار كلمة المرور", "Afficher le mot de passe"),
    );
  });

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector('[type="submit"]');
  const buttonLabel = document.querySelector("#login-button-label");
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  buttonLabel.textContent = loginText(
    "جارٍ تسجيل الدخول…",
    "Connexion en cours…",
  );
  loginError.textContent = "";
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: loginForm.username.value.trim(),
        password: passwordInput.value,
      }),
    });
    if (response.status === 401)
      throw new Error(
        loginText(
          "اسم المستخدم أو كلمة المرور غير صحيحة. يرجى المحاولة مجدداً.",
          "Nom d’utilisateur ou mot de passe incorrect. Veuillez réessayer.",
        ),
      );
    if (response.status === 429)
      throw new Error(
        loginText(
          "محاولات كثيرة. يرجى الانتظار 15 دقيقة قبل المحاولة مجدداً.",
          "Trop de tentatives. Veuillez patienter 15 minutes avant de réessayer.",
        ),
      );
    if (!response.ok)
      throw new Error(
        loginText(
          "تعذر تسجيل الدخول. يرجى المحاولة مجدداً.",
          "Connexion impossible. Veuillez réessayer.",
        ),
      );
    location.replace("/");
  } catch (error) {
    loginError.textContent =
      error instanceof TypeError
        ? loginText(
            "تعذر الاتصال. شغّل الموقع عبر Open-Website ثم أعد المحاولة.",
            "Serveur inaccessible. Ouvrez le site avec Open-Website, puis réessayez.",
          )
        : error.message;
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    buttonLabel.textContent = loginText("تسجيل الدخول", "Se connecter");
  }
});
