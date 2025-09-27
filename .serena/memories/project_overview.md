# PublishOnce Project Overview

## Project Purpose
PublishOnce (聚合发布平台) is a technical article aggregation and publishing platform designed to solve the pain point of tech bloggers having to manually publish articles across multiple platforms. It provides unified data collection and management functionality.

## Core Features
- 📝 **Markdown Editor** - Supports article writing with Notion/VSCode paste import compatibility
- 🚀 **One-click Publishing** - Simultaneously publish to CSDN, Juejin (稀土掘金), Huawei Developer Community, and Hexo personal blogs
- 📊 **Data Statistics** - Collect and visualize reading counts, likes, and comment data from various platforms
- 💬 **Comment Management** - Unified management and response to comments across platforms

## Tech Stack

### Backend (Current Focus)
- **Node.js** + **Express** - Server framework
- **TypeScript** - Type safety
- **MongoDB** - Primary database
- **Redis** - Caching and task queues
- **Bull Queue** - Task queue management
- **JWT** - Authentication
- **Playwright** - Browser automation for scraping

### Frontend (Planned)
- **React 18** + **TypeScript**
- **Ant Design** - UI component library
- **React Router** - Routing
- **Zustand** - State management
- **Axios** - HTTP client
- **ECharts** - Data visualization

## Project Status
Currently in development phase with backend infrastructure being built. The project follows a 4-phase development plan focusing on basic architecture, core functionality, data statistics, and optimization/deployment.