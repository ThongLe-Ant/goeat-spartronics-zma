module.exports = {
  darkMode: ["selector", '[zaui-theme="dark"]'],
  purge: {
    enabled: true,
    content: ["./src/**/*.{js,jsx,ts,tsx,vue}"],
  },
  theme: {
    extend: {
      colors: {
        // GoEat — emerald (xanh phú quý) + gold tokens
        brand: "var(--teal-500)",
        "brand-hover": "var(--teal-600)",
        "brand-press": "var(--teal-700)",
        gold: "var(--gold)",
        page: "var(--bg-page)",
        surface: "var(--bg-surface)",
      },
      spacing: {
        st: "var(--safe-top)",
        sb: "var(--safe-bottom)",
      },
      fontSize: {
        "4xs": ["10px", "14px"],
        "3xs": ["11px", "16px"],
        "2xs": ["12px", "16px"],
        xs: ["13px", "18px"],
        sm: ["14px", "18px"],
        base: ["15px", "20px"],
        lg: ["16px", "22px"],
        xl: ["18px", "24px"],
      },
    },
  },
};
