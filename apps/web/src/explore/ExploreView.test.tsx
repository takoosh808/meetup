import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { ExploreView } from "./ExploreView";

describe("ExploreView", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        sessions: [
          {
            id: "session-1",
            title: "Sunday Beach Volleyball",
            activity_type: "volleyball",
            description: "Open play",
            status: "live",
            scheduled_at: "2026-09-06T14:00:00.000Z",
            broadcast_radius_m: 150,
            checkin_radius_m: 40,
            shutoff_radius_m: 300,
            started_at: "2026-09-06T14:00:00.000Z",
            ended_at: null,
            map_latitude: 34.02,
            map_longitude: -118.491,
          },
        ],
      }),
    })));
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (success: PositionCallback) =>
          success({ coords: { latitude: 34.0195, longitude: -118.4912 } } as GeolocationPosition),
      },
    });
    localStorage.setItem("meetup.token", "test-token");
  });

  it("loads nearby sessions from the user's area", async () => {
    render(
      <AuthProvider>
        <ExploreView />
      </AuthProvider>
    );

    expect(await screen.findByRole("heading", { name: "Plans near you" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Sunday Beach Volleyball" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Using your current area")).toBeInTheDocument());
  });
});