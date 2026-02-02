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
    theme: {
          extend: {
            colors: {
              primary: "#C9DA2B",
              "background-light": "#F8F9FA",
              "background-dark": "#000000",
              "surface-dark": "#1A1A1A",
              "ritma-purple": "#A462A7",
              "ritma-blue": "#4F74B8",
              "ritma-cyan": "#57C5D3",
              "ritma-orange": "#FFC857",
              "ritma-red": "#FF4D4D"
            },
            fontFamily: {
              display: ["Montserrat", "sans-serif"],
              body: ["Roboto", "sans-serif"],
            },
            borderRadius: {
              "DEFAULT": "0.25rem",
              "lg": "0.5rem",
              "xl": "0.75rem",
              "full": "9999px"
            },
          },
        },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
};
