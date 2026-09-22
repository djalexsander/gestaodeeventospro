import { describe, it, expect } from "vitest";
import { getParentRoute, isHomeRoute } from "./navigation";

describe("isHomeRoute", () => {
  it("treats / and /eventos as home", () => {
    expect(isHomeRoute("/")).toBe(true);
    expect(isHomeRoute("/eventos")).toBe(true);
  });

  it("does not treat other top-level routes as home", () => {
    expect(isHomeRoute("/artistas")).toBe(false);
    expect(isHomeRoute("/eventos/abc-123")).toBe(false);
  });
});

describe("getParentRoute", () => {
  it("returns null for home routes", () => {
    expect(getParentRoute("/")).toBeNull();
    expect(getParentRoute("/eventos")).toBeNull();
  });

  it("sends an event detail route back to the events list", () => {
    expect(getParentRoute("/eventos/abc-123")).toBe("/eventos");
    expect(getParentRoute("/eventos/uuid-with-dashes-456")).toBe("/eventos");
  });

  it("sends any other top-level internal screen back to home", () => {
    expect(getParentRoute("/artistas")).toBe("/");
    expect(getParentRoute("/riders")).toBe("/");
    expect(getParentRoute("/cidades")).toBe("/");
    expect(getParentRoute("/funcionarios")).toBe("/");
    expect(getParentRoute("/usuarios")).toBe("/");
    expect(getParentRoute("/plano-assinatura")).toBe("/");
    expect(getParentRoute("/master")).toBe("/");
    expect(getParentRoute("/empresas")).toBe("/");
    expect(getParentRoute("/planos")).toBe("/");
    expect(getParentRoute("/financeiro")).toBe("/");
    expect(getParentRoute("/admin")).toBe("/");
    expect(getParentRoute("/configuracoes")).toBe("/");
  });
});
