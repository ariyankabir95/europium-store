module.exports = {
    content: [
        "./app/**/*.{js,jsx}",
        "./components/**/*.{js,jsx}",
    ],
    theme: {
        extend: {
            colors: {
                warm: "rgb(var(--theme-warm) / <alpha-value>)",
                cream: "rgb(var(--theme-cream) / <alpha-value>)",
                sand: "rgb(var(--theme-sand) / <alpha-value>)",
                taupe: "rgb(var(--theme-taupe) / <alpha-value>)",
                umber: "rgb(var(--theme-umber) / <alpha-value>)",
                charcoal: "rgb(var(--theme-charcoal) / <alpha-value>)",
                ink: "rgb(var(--theme-ink) / <alpha-value>)",
            },
            fontFamily: {
                sans: [
                    "var(--font-sans)",
                    "system-ui",
                    "sans-serif",
                ],
                serif: [
                    "var(--font-serif)",
                    "Georgia",
                    "serif",
                ],
                display: [
                    "var(--font-display)",
                    "Georgia",
                    "serif",
                ],
                asap: [
                    "var(--font-asap)",
                    "Arial",
                    "Helvetica",
                    "sans-serif",
                ],
                bebas: [
                    "var(--font-bebas)",
                    "Impact",
                    "sans-serif",
                ],
            },
            maxWidth: {
                site: "1440px",
            },
        },
    },
    plugins: [],
};
