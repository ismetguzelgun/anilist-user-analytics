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
          xs: "2px",
          sm: "3px",
          md: "4px",
          lg: "5px",
          xl: "6px",
        },
        colors: {
          blue: [
            "#edf4ff",
            "#dce8fb",
            "#bdd2f7",
            "#97b8f1",
            "#769fe9",
            "#5f8fe6",
            "#4d83e5",
            "#3b70cc",
            "#305fb5",
            "#244f9f",
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
