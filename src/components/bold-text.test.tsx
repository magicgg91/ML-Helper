import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderBoldText } from "./bold-text";

afterEach(cleanup);

// Bloc 62/B: a single regex is all this needs — **text** -> <strong>,
// literal everywhere else. No italics, links, lists, or images to
// interpret (deliberately not the full markdown pipeline, Blocs 55-58).
describe("renderBoldText", () => {
  it("wraps **text** in <strong>, leaves the surrounding text untouched", () => {
    const { container } = render(<>{renderBoldText("Coffre **rare** doré")}</>);
    const strong = container.querySelector("strong");
    expect(strong).toHaveTextContent("rare");
    expect(container).toHaveTextContent("Coffre rare doré");
  });

  it("handles multiple bold spans in the same string", () => {
    const { container } = render(
      <>{renderBoldText("**Un** mot puis **deux** mots")}</>,
    );
    const strongs = container.querySelectorAll("strong");
    expect(Array.from(strongs).map((el) => el.textContent)).toEqual([
      "Un",
      "deux",
    ]);
    expect(container).toHaveTextContent("Un mot puis deux mots");
  });

  it("renders plain text with no strong element when there is no **bold** marker", () => {
    const { container } = render(<>{renderBoldText("Texte tout simple")}</>);
    expect(container.querySelector("strong")).toBeNull();
    expect(container).toHaveTextContent("Texte tout simple");
  });

  it("leaves other markdown syntax literal — only ** is interpreted", () => {
    const { container } = render(
      <>
        {renderBoldText(
          "*italique* _souligné_ [lien](https://example.com) # titre",
        )}
      </>,
    );
    expect(container.querySelector("strong")).toBeNull();
    expect(container.querySelector("em")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container).toHaveTextContent(
      "*italique* _souligné_ [lien](https://example.com) # titre",
    );
  });

  it("handles an empty string without throwing", () => {
    const { container } = render(<>{renderBoldText("")}</>);
    expect(container).toHaveTextContent("");
  });
});
