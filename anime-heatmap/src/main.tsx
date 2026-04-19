import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import App from "./App";
import "@mantine/core/styles.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider
      defaultColorScheme="light"
      theme={{
        primaryColor: "blue",
        fontFamily: "IBM Plex Sans, Helvetica Neue, sans-serif",
        headings: {
          fontFamily: "IBM Plex Sans, Helvetica Neue, sans-serif",
        },
        radius: {
          md: "4px",
          xl: "6px",
        },
        colors: {
          blue: [
            "#eef4ff",
            "#dce7fb",
            "#b8cef5",
            "#8fb3ee",
            "#6f9ce9",
            "#5b8de5",
            "#4f84e4",
            "#3f72cc",
            "#3565b7",
            "#2457a2",
          ],
        },
        shadows: {
          xs: "none",
          sm: "none",
          md: "none",
          lg: "none",
          xl: "none",
        },
      }}
    >
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
