# Telemetry-App

A week-long project focused on building an Angular telemetry app, using pre-built components and libraries.

## Project Overview

This project is part of the Weekly-Projects series aimed at exploring web technologies and building practical applications. The goal is to create a functional application that demonstrates core understanding of the Angular framework.

## Learning Objectives

- **Components-based development:** Understanding Angular component architecture and lifecycle
- **Angular Syntax:** Mastering directives, data binding, and template syntax
- **TypeScript:** Leveraging strong typing and modern JavaScript features
- **Testing:** Implementing unit and integration tests
- **SCSS:** Advanced styling with variables, mixins, and component-scoped styles
- **External Components and Libraries:** Integrating third-party UI libraries and charting components

## Project Structure

This will be a joint project with a simple backend that simulates values and behaviours, and an angular frontend

- Python backend
- Angular frontend

## Design Philosophy

- **Minimalist UI**: Clean and simple interface
- **User-Friendly**: Intuitive interactions and clear visual feedback
- **Performance**: Efficient DOM manipulation with information displayed as fast as possible
- **Accessibility**: Semantic HTML and keyboard navigation support

## Technical Approach

### Frontend Architecture (Angular)

- Component-based architecture with feature modules
- Reactive programming
- Angular Material or PrimeNG for UI components
- Chart.js or D3.js for data visualization
- Angular CLI for development and build processes

### Backend Architecture (Python)

- WebSocket support for real-time data streaming
- Simulated telemetry data generation

### Key Features to Implement

#### Core Features

- [ ] Real-time telemetry dashboard
- [ ] Multiple data visualization charts (line, bar, gauge)
- [ ] WebSocket connection for live data updates
- [ ] Responsive design for different screen sizes
- [ ] Data filtering and time range selection
- [ ] Communication from the frontend to the backend

#### Advanced Features (If time permits)

- [ ] Historical data playback
- [ ] Alert/threshold configuration
- [ ] Data export functionality
- [ ] Multiple dashboard layouts
- [ ] Dark/light theme toggle
- [ ] Custom chart configurations
- [ ] Mobile support

## Project Structure

```
Telemetry-App/
├── backend/                    # Python backend
│   ├── app.py                  # Main backend application
│   ├── requirements.txt        # Python dependencies
│   └── README.md               # Backend documentation
├── frontend/                   # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # Reusable components
│   │   │   ├── services/       # Angular services
│   │   │   ├── models/         # TypeScript interfaces
│   │   │   ├── pages/          # Route components
│   │   │   └── shared/         # Shared modules
│   │   ├── assets/             # Static assets
│   │   └── styles/             # Global styles
│   ├── angular.json            # Angular configuration
│   ├── package.json            # Node dependencies
│   └── README.md               # Frontend documentation
└── README.md                   # This file
```

## Technology Stack

### Frontend

- **Framework:** Angular 17+
- **Language:** TypeScript
- **Styling:** SCSS + Angular Material/PrimeNG
- **Charts:** Chart.js or ng2-charts
- **HTTP Client:** Angular HttpClient
- **WebSockets:** Angular WebSocket service
- **Testing:** *To be determined*

### Backend

- **Language:** Python
- **WebSockets:** FastAPI WebSocket support
- **Data Generation:** Random/synthetic telemetry data
- **Testing:** pytest

## Design Decisions

### UI/UX Approach

- Dashboard-style layout with multiple panels
- Real-time updates without page refresh
- Clean, professional interface suitable for monitoring applications
- Color coding for different telemetry parameters

### Data Visualization

- Line charts for time-series data
- Gauge charts for current values
- Bar charts for comparative data
- Responsive charts that adapt to container size

### Performance Considerations

- Efficient data streaming with WebSockets
- Chart data limiting to prevent memory issues
- OnPush change detection strategy for better performance
- Lazy loading for feature modules

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Angular CLI (`npm install -g @angular/cli`)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend Setup

```bash
cd frontend
npm install
ng serve
```

### Development URLs

- Frontend: `http://localhost:4200`
- Backend API: `http://localhost:8000`
- WebSocket: `ws://localhost:8000/ws`

## Success Criteria

- ✅ Real-time telemetry dashboard displaying live data
- ✅ Multiple chart types showing different data perspectives
- ✅ WebSocket connection maintaining live updates
- ✅ Responsive design working on desktop
- ✅ Clean, maintainable Angular code structure
- ✅ Proper error handling and loading states
- ✅ Basic test coverage for core functionality

## Learning Outcomes

This project will demonstrate:

- Modern Angular development practices
- Real-time web application architecture
- Integration between frontend and backend systems
- Data visualization best practices
- TypeScript and modern JavaScript usage

## Design Decisions
*Will host sections explaining all the decisions made in the process and why were they made*

## Notes and Reflections
*This section will be updated throughout the development process with insights, challenges, and solutions discovered during implementation.*

## Resources

- [Angular Documentation](https://angular.io/docs)
- [Angular Material](https://material.angular.io/)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [RxJS Documentation](https://rxjs.dev/)

---

**Started:** July 28, 2025
**Developer:** [Your Name]
**Project:** Weekly-Projects Telemetry App
