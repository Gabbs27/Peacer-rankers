import { describe, it, expect } from "vitest";
import { findClientCommandLine, parseClientArgs, parseLockfile, parseOverride } from "./credentials";

describe("parseLockfile", () => {
  it("reads port and password", () => {
    expect(parseLockfile("LeagueClient:4321:61234:s3cr3t-Token_x:https\n")).toEqual({ port: 61234, password: "s3cr3t-Token_x" });
  });

  it("rejects malformed content", () => {
    expect(parseLockfile("")).toBeNull();
    expect(parseLockfile("LeagueClient:4321:notaport:pw:https")).toBeNull();
    expect(parseLockfile("LeagueClient:4321:61234::https")).toBeNull();
  });
});

describe("client process arguments", () => {
  const ps = [
    "/Users/Shared/Riot Games/Riot Client.app/Contents/MacOS/RiotClientServices --launch-product=league_of_legends",
    '/Applications/League of Legends.app/Contents/LoL/LeagueClient.app/Contents/MacOS/LeagueClientUx --riotclient-auth-token=x --app-port=55001 --remoting-auth-token=AbC-123_def --install-directory=/Applications/League of Legends.app/Contents/LoL',
    "/bin/zsh -l",
  ].join("\n");

  it("finds the UX process line and its credentials", () => {
    const line = findClientCommandLine(ps)!;
    expect(line).toContain("LeagueClientUx");
    expect(parseClientArgs(line)).toEqual({ port: 55001, password: "AbC-123_def" });
  });

  it("returns null when the client is closed", () => {
    expect(findClientCommandLine("/bin/zsh -l\n/usr/sbin/cfprefsd agent")).toBeNull();
    expect(parseClientArgs("LeagueClientUx --app-port=55001")).toBeNull();
  });
});

describe("parseOverride", () => {
  it("reads <port>:<token> and rejects anything else", () => {
    expect(parseOverride("50303:e2e-abc_1")).toEqual({ port: 50303, password: "e2e-abc_1" });
    expect(parseOverride("70000:x")).toBeNull();
    expect(parseOverride("50303")).toBeNull();
    expect(parseOverride(undefined)).toBeNull();
  });
});
