/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                sempermed: {
                    green: '#009E91',
                    'green-dark': '#00877C',
                    gold: '#C6A87C',
                    text: '#2D3436',
                }
            }
        },
    },
    plugins: [],
}
