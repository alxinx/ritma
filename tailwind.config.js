module.exports = {
  content: [
    "./views/**/*.pug",
    "./components/**/*.pug",
    "./public/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#C9DA2B",
        "background-dark": "#000000",
      },
      fontFamily: {
        display: ["Spline Sans", "sans-serif"],
        montserrat: ["Montserrat", "sans-serif"],
        roboto: ["Roboto", "sans-serif"],
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
};
