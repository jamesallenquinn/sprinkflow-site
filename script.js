// --- config (public values; the anon key is designed to be exposed client-side) ---
const SUPABASE_URL = "https://aebghirpjiwiergkafej.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlYmdoaXJwaml3aWVyZ2thZmVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjA0NTQsImV4cCI6MjA5NTg5NjQ1NH0.ogDc26YGo3AEAZZcPII_p3htPml4pjQa4vOyYAU1sSg";
const CLOUD_API = "https://sprinkflow-cloud-api.onrender.com";
const SITE_URL = "https://sprinkflow.studio";

const supa = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// --- year ---
document.getElementById("year").textContent = String(new Date().getFullYear());

// --- sticky nav shadow ---
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 12);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

// --- scroll reveal ---
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); } }),
  { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// --- password show/hide ---
const pwToggle = document.getElementById("suPwToggle");
const pwInput = document.getElementById("suPassword");
pwToggle?.addEventListener("click", () => {
  const reveal = pwInput.type === "password";
  pwInput.type = reveal ? "text" : "password";
  pwToggle.textContent = reveal ? "🙈" : "👁";
  pwToggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
  pwInput.focus();
});

// --- signup ---
const form = document.getElementById("signupForm");
const note = document.getElementById("suNote");
const submit = document.getElementById("suSubmit");

function setNote(msg, kind) {
  note.textContent = msg;
  note.className = "form-note" + (kind ? " " + kind : "");
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.getElementById("suName").value.trim();
  const company = document.getElementById("suCompany").value.trim();
  const email = document.getElementById("suEmail").value.trim();
  const password = document.getElementById("suPassword").value;

  if (!email || !email.includes("@")) { setNote("Please enter a valid email.", "err"); return; }
  if (password.length < 8) { setNote("Password needs to be at least 8 characters.", "err"); return; }
  if (!supa) { setNote("Signup is temporarily unavailable. Please try again shortly.", "err"); return; }

  submit.disabled = true;
  setNote("Creating your account…", "");

  try {
    const { data, error } = await supa.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: SITE_URL + "/?confirmed=1",
        data: { full_name: name, company },
      },
    });
    if (error) throw error;

    // Best-effort: queue a beta license so it auto-applies on first app sign-in.
    // Never blocks signup if the cloud API is cold/unavailable.
    try {
      await fetch(CLOUD_API + "/beta/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, company }),
      });
    } catch (_) { /* non-fatal */ }

    const identities = data?.user?.identities;
    if (Array.isArray(identities) && identities.length === 0) {
      setNote("You already have an account with this email. Check your inbox to confirm, or just download below.", "ok");
    } else {
      setNote("Almost there — check your email and click the confirmation link, then download below.", "ok");
    }
    form.reset();
    document.getElementById("downloadBtn")?.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (err) {
    const msg = (err && err.message) || "Something went wrong. Please try again.";
    setNote(msg, "err");
  } finally {
    submit.disabled = false;
  }
});

// --- graceful screenshot placeholders (until real captures are dropped in) ---
document.querySelectorAll("img[data-shot]").forEach((img) => {
  img.addEventListener("error", () => {
    const frame = img.closest(".frame");
    if (!frame || frame.querySelector(".shot-ph")) return;
    img.style.display = "none";
    const ph = document.createElement("div");
    ph.className = "shot-ph";
    ph.textContent = (img.getAttribute("alt") || "Screenshot") + " — coming soon";
    frame.appendChild(ph);
  });
});

// --- post-confirmation greeting ---
if (new URLSearchParams(location.search).get("confirmed") === "1") {
  setNote("Email confirmed — you're in! Download SprinkFlow below.", "ok");
  document.getElementById("download")?.scrollIntoView({ behavior: "smooth" });
}
