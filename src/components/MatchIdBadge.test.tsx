import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MatchIdBadge from "./MatchIdBadge";

describe("MatchIdBadge", () => {
  it("renders the match id and an accessible copy label", () => {
    const html = renderToStaticMarkup(<MatchIdBadge matchId="LA1_1729715434" />);
    expect(html).toContain("LA1_1729715434");
    expect(html).toContain("Copiar ID de la partida");
    expect(html).toContain("<button");
  });
});
