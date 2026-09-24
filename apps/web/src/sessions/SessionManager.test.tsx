import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { SessionManager } from "./SessionManager";

const token = "test-token";

describe("SessionManager", () => {
  beforeEach(() => {
    localStorage.setItem("meetup.token", token);
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (success: PositionCallback) =>
          success({ coords: { latitude: 34.0195, longitude: -118.4912, accuracy: 5 } } as GeolocationPosition),
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/auth/me")) {
          return { ok: true, json: async () => ({ user: { id: "user-1", email: "host@example.com", displayName: "Host", avatarUrl: null, createdAt: "2026-01-01" } }) };
        }
        if (url.endsWith("/sessions/mine")) {
          return { ok: true, json: async () => ({ sessions: [] }) };
        }
        if (url.endsWith("/sessions") && init?.method === "POST") {
          return {
            ok: true,
            json: async () => ({ session: { id: "session-1", title: "Sunday Beach Volleyball", activity_type: "volleyball", description: "Open play at the south courts.", status: "scheduled", scheduled_at: "2026-09-06T14:00:00.000Z", duration_minutes: 120, broadcast_radius_m: 150, checkin_radius_m: 40, shutoff_radius_m: 300, started_at: null, ended_at: null } }),
          };
        }
        throw new Error(`Unexpected request: ${url}`);
      })
    );
  });

  it("creates the default Sunday volleyball session", async () => {
    render(
      <AuthProvider>
        <SessionManager />
      </AuthProvider>
    );

    await screen.findByRole("heading", { name: "Your sessions" });
    fireEvent.click(screen.getByRole("button", { name: "Create session" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Host" })).toHaveClass("active");
      expect(screen.getByText("No event is live. Create an event, then start hosting it here.")).toBeInTheDocument();
    });

    const createCall = vi.mocked(fetch).mock.calls.find(
      ([url, init]) => String(url).endsWith("/sessions") && init?.method === "POST"
    );
    expect(createCall).toBeDefined();
    expect(JSON.parse(String(createCall![1]?.body))).toMatchObject({
      title: "Sunday Beach Volleyball",
      activityType: "volleyball",
      broadcastRadiusM: 150,
      checkinRadiusM: 40,
      shutoffRadiusM: 300,
      durationMinutes: 120,
    });
  });
});