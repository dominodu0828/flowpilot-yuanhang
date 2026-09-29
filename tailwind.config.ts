import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F5F7",
        label: {
          DEFAULT: "#13294B",
          2: "rgba(28,28,30,0.62)",
          3: "rgba(28,28,30,0.42)",
          4: "rgba(28,28,30,0.22)",
        },
        hairline: "rgba(60,60,67,0.18)",
        // primary accent now maps to the FlowPilot jade (was #007AFF)
        blue: "#1F9E89",
        ink: "#13294B",
        jade: { DEFAULT: "#1F9E89", light: "#3CC7AE" },
        gold: "#E8B04A",
        slate: "#4A5B74",
        green: "#1E9E45",
        orange: "#C87500",
        red: "#D70015",
        teal: "#007A8A",
      },
      borderRadius: { card: "18px", sheet: "24px" },
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Segoe UI Variable Text", "Segoe UI",
          "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "PingFang TC", "Microsoft JhengHei",
          "system-ui", "sans-serif",
        ],
      },
      boxShadow: {
        sheet: "0 24px 60px -24px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.08)",
        chip: "0 1px 3px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
