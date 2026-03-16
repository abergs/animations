import "./styles.css";
import { agentAccess } from "./diagrams/agent-access";

// Dark mode: read from URL and persist via query param
const params = new URLSearchParams(window.location.search);
const isDark = params.get("theme") === "dark";
if (isDark) document.body.classList.add("dark");

const toggle = document.createElement("button");
toggle.className = "dark-toggle";
toggle.textContent = isDark ? "Light" : "Dark";
toggle.addEventListener("click", () => {
  const dark = document.body.classList.toggle("dark");
  toggle.textContent = dark ? "Light" : "Dark";
  const url = new URL(window.location.href);
  if (dark) {
    url.searchParams.set("theme", "dark");
  } else {
    url.searchParams.delete("theme");
  }
  window.history.replaceState(null, "", url.toString());
});
document.body.appendChild(toggle);

const container = document.getElementById("app")!;
agentAccess(container);
