# Contributing to StarWise

First off, thank you for considering contributing to StarWise! 🎉

StarWise is a community-driven project and we welcome contributions from developers of all skill levels. Whether you're fixing bugs, adding features, improving documentation, or suggesting new ideas, your help is appreciated.

## 🤝 How to Contribute

### Reporting Bugs

Before creating bug reports, please check the [existing issues](../../issues) to see if the problem has already been reported. When you create a bug report, please include as many details as possible:

- **Clear, descriptive title**
- **Steps to reproduce** the behavior
- **Expected behavior** vs **actual behavior**
- **Screenshots** if applicable
- **Environment details** (OS, Node.js version, browser, etc.)
- **Error messages** or console output

### Suggesting Features

We love feature suggestions! Before suggesting a new feature:

1. Check [existing discussions](../../discussions) and [issues](../../issues)
2. Consider if the feature fits StarWise's core mission
3. Think about how it would benefit the broader community

When suggesting features, please include:
- **Clear description** of the feature
- **Use cases** and **user stories**
- **Potential implementation ideas** (if you have them)
- **Screenshots or mockups** (if applicable)

### Code Contributions

#### Development Setup

1. **Fork the repository**
2. **Clone your fork:**
   ```bash
   git clone https://github.com/yourusername/starwise.git
   cd starwise
   ```
3. **Install dependencies:**
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```
4. **Set up environment variables:**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your API keys
   ```
5. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Making Changes

- **Follow existing code style** and patterns
- **Write clear, descriptive commit messages**
- **Add comments** for complex logic
- **Test your changes thoroughly**
- **Update documentation** if needed

#### Code Style Guidelines

- **JavaScript/TypeScript:**
  - Use ES6+ features
  - Prefer `const` and `let` over `var`
  - Use meaningful variable names
  - Add JSDoc comments for functions

- **React Components:**
  - Use functional components with hooks
  - Follow Material-UI patterns
  - Keep components focused and reusable

- **Backend:**
  - Use async/await over promises
  - Add proper error handling
  - Follow RESTful API conventions

#### Submitting Changes

1. **Test your changes:**
   ```bash
   # Test frontend
   npm run dev
   
   # Test backend
   cd backend && npm start
   
   # Test Docker build
   docker-compose up --build
   ```

2. **Commit your changes:**
   ```bash
   git add .
   git commit -m \"feat: add amazing new feature\"
   ```

3. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request**

#### Pull Request Guidelines

- **Use a clear, descriptive title**
- **Link to related issues** using \"Fixes #123\" or \"Closes #123\"
- **Describe what you changed** and why
- **Include screenshots** for UI changes
- **Test thoroughly** before submitting
- **Keep PRs focused** - one feature/fix per PR

## 🎯 Priority Areas for Contribution

### 🆘 High Priority
- **Bug fixes** and stability improvements
- **Performance optimizations**
- **Accessibility improvements**
- **Mobile responsiveness**
- **Error handling** and user feedback

### 🚀 New Features
- **Additional AI providers** (OpenAI, Claude, etc.)
- **Export/Import functionality**
- **Browser extension**
- **Collaboration features**
- **Advanced analytics**
- **Internationalization (i18n)**

### 📚 Documentation
- **API documentation**
- **Deployment guides**
- **Video tutorials**
- **Translation** to other languages

### 🧪 Testing
- **Unit tests** for components
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows
- **Performance testing**

## 📋 Development Guidelines

### Project Structure
```
starwise/
├── backend/              # Express.js backend
│   ├── index.js         # Main server file
│   ├── package.json     # Backend dependencies
│   └── .env.example     # Environment template
├── public/              # Static assets
├── src/                 # React frontend source
├── docker-compose.yml   # Docker configuration
├── dockerfile          # Docker build instructions
└── package.json        # Frontend dependencies
```

### Environment Setup
- **Node.js:** v18 or later
- **npm:** Latest stable version
- **Docker:** For containerized development

### API Integration
- **GitHub API:** For repository data
- **Google Gemini:** For AI tagging
- **Rate limiting:** Respect API limits

## 🤔 Questions?

Have questions about contributing? Feel free to:

- **Open a [Discussion](../../discussions)**
- **Create an [Issue](../../issues)**
- **Review existing documentation**

## 🏆 Recognition

Contributors are recognized in:
- **GitHub contributors list**
- **Release notes** for significant contributions
- **Special thanks** in documentation

## 📜 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- **Be respectful** and inclusive
- **Welcome newcomers** and help them learn
- **Focus on constructive feedback**
- **Respect different opinions** and experiences
- **Report inappropriate behavior**

---

**Thank you for making StarWise better! 🌟**

Every contribution, no matter how small, helps make StarWise a better tool for the entire GitHub community.