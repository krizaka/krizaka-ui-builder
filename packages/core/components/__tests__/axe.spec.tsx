import { render } from "@testing-library/react";
import axe from "axe-core";
import { Loader } from "../Loader";
import { ViewportControls } from "../ViewportControls";

jest.mock("../Loader/styles.module.css");
jest.mock("../ViewportControls/styles.module.css");

// Contrast needs real layout and the compiled theme CSS, so the audit covers the structural rules.
const RULES = { "color-contrast": { enabled: false } };

describe.each(["dark", "light"])("axe on Puck's own UI (%s theme)", (theme) => {
  const audit = async (ui: React.ReactElement) => {
    const { container } = render(<div data-theme={theme}>{ui}</div>);
    const { violations } = await axe.run(container, { rules: RULES });
    return violations.map((v) => v.id);
  };

  it("the loader has no aria-prohibited-attr", async () => {
    expect(await audit(<Loader />)).toEqual([]);
  });

  it("the viewport zoom select has an accessible name", async () => {
    expect(
      await audit(
        <ViewportControls
          autoZoom={1}
          zoom={1}
          onViewportChange={() => undefined}
          onZoom={() => undefined}
        />
      )
    ).toEqual([]);
  });
});
