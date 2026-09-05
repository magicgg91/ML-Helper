import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GameImage } from "./game-image";

afterEach(cleanup);

describe("GameImage", () => {
  it("renders the real file while it hasn't failed to load", () => {
    render(
      <GameImage
        src="/gems/gemme-attaque-legende.png"
        alt="Gemme Attaque Légende"
        width={256}
        height={256}
        fallback={<span>repli</span>}
      />,
    );
    expect(
      screen.getByRole("img", { name: "Gemme Attaque Légende" }),
    ).toHaveAttribute("src", "/gems/gemme-attaque-legende.png");
    expect(screen.queryByText("repli")).not.toBeInTheDocument();
  });

  // Bloc 91/M2: the intrinsic dimensions are emitted so the browser can
  // reserve the box before the file loads (belt-and-braces with the fixed CSS).
  it("Bloc91/M2: emits the intrinsic width/height so the box is reserved", () => {
    render(
      <GameImage
        src="/gems/gemme-attaque-legende.png"
        alt="Gemme Attaque Légende"
        width={256}
        height={256}
        fallback={<span>repli</span>}
      />,
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("width", "256");
    expect(img).toHaveAttribute("height", "256");
  });

  it("shows the visual fallback instead of a broken image icon once loading fails", () => {
    render(
      <GameImage
        src="/gems/gemme-attaque-legende.png"
        alt="Gemme Attaque Légende"
        width={256}
        height={256}
        fallback={<span>repli</span>}
      />,
    );
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("repli")).toBeVisible();
  });

  it("Bloc36/B: loads lazily by default, eagerly only when told to (LCP tiles)", () => {
    const { rerender } = render(
      <GameImage
        src="/tools/cities.webp"
        alt="Villes"
        width={500}
        height={500}
        fallback={<span>repli</span>}
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");

    rerender(
      <GameImage
        src="/tools/cities.webp"
        alt="Villes"
        width={500}
        height={500}
        fallback={<span>repli</span>}
        eager
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("loading", "eager");
  });

  it("retries automatically once src changes, as if the file had just been deposited", () => {
    const { rerender } = render(
      <GameImage
        src="/gems/gemme-attaque-legende.png"
        alt="a"
        width={256}
        height={256}
        fallback={<span>repli</span>}
      />,
    );
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByText("repli")).toBeVisible();

    rerender(
      <GameImage
        src="/gems/gemme-attaque-bronze.png"
        alt="a"
        width={256}
        height={256}
        fallback={<span>repli</span>}
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "/gems/gemme-attaque-bronze.png",
    );
  });
});
