const themeKey = "theme-preference";

const getThemPref = () => {
  if (localStorage.getItem(themeKey)) {
    return localStorage.getItem(themeKey);
  } else {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    // return "light";
  }
};

const theme = {
  value: getThemPref(),
};

const setTheme = () => {
  // skip themeing for home page
  bodyClasses = document.querySelector("body")?.classList;
  if (bodyClasses.contains("home")) {
    return;
  }

  theme.value = getThemPref();
  if (theme.value === "dark") {
    bodyClasses.remove("theme-light");
    bodyClasses.add("theme-dark");

    document
      .querySelector("#switch-to-light")
      ?.classList.remove("current-theme");
    document.querySelector("#switch-to-dark")?.classList.add("current-theme");

    document
      .querySelector("#floating-menu")
      .title = "switch to light theme";
  } else {
    bodyClasses.remove("theme-dark");
    bodyClasses.add("theme-light");

    document.querySelector("#switch-to-light")?.classList.add("current-theme");
    document
      .querySelector("#switch-to-dark")
      ?.classList.remove("current-theme");

    document
      .querySelector("#floating-menu")
      .title = "switch to dark theme";
  }
};

const saveThemeSelection = function(theme) {
  localStorage.setItem(themeKey, theme);
  setTheme();
};

const flipTheme = () => {
  currentTheme = getThemPref();
  if (currentTheme == "dark") {
    saveThemeSelection("light");
  } else {
    saveThemeSelection("dark");
  }
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
    .querySelector("#floating-menu")
    .addEventListener("click", flipTheme);
  
  // document
  //   .querySelector("#switch-to-dark")
  //   .addEventListener("click", switchToDark);
  // document
  //   .querySelector("#switch-to-light")
  //   .addEventListener("click", switchToLight);
};
