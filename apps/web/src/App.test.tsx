import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";

describe("App", () => {
  it("renders the Meetup heading", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(screen.getByRole("heading", { name: "Meetup" })).toBeDefined();
  });

  it("shows the login form when logged out", async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeDefined();
  });
});
