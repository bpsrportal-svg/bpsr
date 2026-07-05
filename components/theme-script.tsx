export function ThemeScript() {
  const code = `
    (function () {
      try {
        var stored = window.localStorage.getItem("bpsr-theme");
        var theme = stored === "light" || stored === "dark" ? stored : "dark";
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
      } catch (error) {
        document.documentElement.dataset.theme = "dark";
        document.documentElement.style.colorScheme = "dark";
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
