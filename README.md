# ConorFight Platform

This is a UFC & MMA platform project, consisting of a frontend built with HTML, CSS, and JavaScript, and a backend powered by Strapi CMS.

## Project Structure

```
conorfight-platform/
├── frontend/
│   ├── pages/
│   │   ├── index.html
│   │   ├── news.html
│   │   ├── fight-card.html
│   │   ├── prediction.html
│   │   └── fighters.html
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── api.js
│   │   ├── homepage.js
│   │   ├── news.js
│   │   └── fighters.js
│   └── config/
│       └── constants.js
├── backend/
│   └── strapi/
│       ├── api/
│       ├── components/
│       └── config/
└── README.md
```

## Getting Started

### Frontend

Navigate to the `frontend` directory and open the `.html` files in your browser to view the different pages. The JavaScript files handle dynamic content and interactions, while `style.css` provides the styling.

### Backend (Strapi)

The `backend/strapi` directory is set up to host your Strapi CMS instance. To get started with the backend:

1.  **Install Strapi:** If you haven't already, install Strapi globally or locally:
    ```bash
    npm install -g strapi@latest
    # or
    npx create-strapi-app my-project --quickstart
    ```
2.  **Move your Strapi project:** You would typically create your Strapi project directly within the `backend/strapi` directory or move an existing one here.
3.  **Run Strapi:** Navigate to your Strapi project directory (`conorfight-platform/backend/strapi`) and run:
    ```bash
    npm run develop
    ```
    This will start the Strapi server, usually accessible at `http://localhost:1337/admin`.

## Features

-   **Responsive Design:** Adapts to various screen sizes.
-   **Dynamic Content:** (Planned) Integration with Strapi for news, fight cards, and fighter data.
-   **User Authentication:** (Planned) Login and Sign Up functionality.
-   **Fight Predictions:** Engage users with prediction features for upcoming fights.
-   **Fighter Profiles:** Detailed information and stats for MMA fighters.

## Customization

-   **Styling:** Modify `frontend/css/style.css` to change the look and feel.
-   **Frontend Logic:** Update JavaScript files in `frontend/js/` for new features or interactions.
-   **Backend Data:** Configure your Strapi models and content types within `backend/strapi/api`, `components`, and `config` to manage your platform's data.

Feel free to contribute or suggest improvements!
