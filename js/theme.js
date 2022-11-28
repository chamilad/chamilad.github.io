const themeKey = "theme-preference";

const getThemPref = () => {
  if (localStorage.getItem(themeKey)) {
    return localStorage.getItem(themeKey);
  } else {
    // return window.matchMedia("(prefers-color-scheme: dark)").matches
    // ? "dark"
    // : "light";
    return "light";
  }
};

const theme = {
  value: getThemPref(),
};

const setTheme = () => {
  theme.value = getThemPref();
  if (theme.value === "dark") {
    document.querySelector("body")?.classList.remove("theme-light");
    document.querySelector("body")?.classList.add("theme-dark");

    document
      .querySelector("#switch-to-light")
      ?.classList.remove("current-theme");
    document.querySelector("#switch-to-dark")?.classList.add("current-theme");
  } else {
    document.querySelector("body")?.classList.remove("theme-dark");
    document.querySelector("body")?.classList.add("theme-light");

    document.querySelector("#switch-to-light")?.classList.add("current-theme");
    document
      .querySelector("#switch-to-dark")
      ?.classList.remove("current-theme");
  }
};

const saveThemeSelection = function(theme) {
  localStorage.setItem(themeKey, theme);
  setTheme();
};

const switchToDark = () => {
  saveThemeSelection("dark");
};

const switchToLight = () => {
  saveThemeSelection("light");
};

setTheme();

window.onload = () => {
  setTheme();
  document
    .querySelector("#switch-to-dark")
    .addEventListener("click", switchToDark);
  document
    .querySelector("#switch-to-light")
    .addEventListener("click", switchToLight);
};
