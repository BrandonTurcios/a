# React + Vite + Tailwind CSS

A modern React application built with Vite and styled with Tailwind CSS.

## Features

- ⚡ **Vite** - Lightning fast build tool and dev server
- ⚛️ **React 18** - Latest React with hooks and modern features
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🔥 **Hot Module Replacement** - Instant feedback during development
- 📱 **Responsive Design** - Mobile-first approach
- 🚀 **Production Ready** - Optimized builds

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone or download this project
2. Navigate to the project directory:
   ```bash
   cd my-react-app
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and visit `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
my-react-app/
├── public/          # Static assets
├── src/
│   ├── assets/      # Images and other assets
│   ├── App.jsx      # Main application component
│   ├── index.css    # Global styles with Tailwind directives
│   └── main.jsx     # Application entry point
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS configuration
├── vite.config.js        # Vite configuration
└── package.json          # Dependencies and scripts
```

## Customization

### Tailwind CSS

The project is configured with Tailwind CSS. You can customize the design system by editing `tailwind.config.js`:

- Add custom colors, fonts, and spacing
- Extend the theme with your brand values
- Add custom components and utilities

### Adding New Components

1. Create new components in the `src` directory
2. Use Tailwind CSS classes for styling
3. Import and use them in `App.jsx` or other components

## Deployment

### Build for Production

```bash
npm run build
```

This creates a `dist` folder with optimized files ready for deployment.

### Deploy to Various Platforms

- **Vercel**: Connect your GitHub repository
- **Netlify**: Drag and drop the `dist` folder
- **GitHub Pages**: Use GitHub Actions for automatic deployment

## Learn More

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)

## License

This project is open source and available under the [MIT License](LICENSE).
