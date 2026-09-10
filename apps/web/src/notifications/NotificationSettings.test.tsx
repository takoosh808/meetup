import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationSettings } from "./NotificationSettings";
import { AuthProvider } from "../auth/AuthContext";

describe("NotificationSettings", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("Notification", {
      permission: "default",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });
  });

  it("requests permission and enables live session alerts", async () => {
    render(
      <AuthProvider>
        <NotificationSettings />
      </AuthProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));
    expect(await screen.findByRole("button", { name: "Turn off" })).toBeInTheDocument();
    expect(localStorage.getItem("meetup.notifications.enabled")).toBe("true");
  });
});