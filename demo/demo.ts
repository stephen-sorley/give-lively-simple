import { createHTML, type CreateHTMLOptions } from "../gl-simple-builder.ts";

const abspath = (relpath: string) : string => {
  return new URL(relpath, window.location.origin).href;
}

const qs = (query: string) => document.querySelector(query);

const container = qs(".widget-container");
const code = qs("code");
const form = qs("form.config") as HTMLFormElement | null;

const headHTML = `\
<link rel="stylesheet" href="${abspath("gl-simple.min.css")}" />
<script type="module" defer src="${abspath("gl-simple-runtime.min.js")}" ></script>\
`;
let bodyHTML : string | undefined;

const parseNumbers = (strlist?: string | null) => {
  if (!strlist) return [];
  try {
    return strlist.split(',').map(item => {
      const num = parseInt(item.trim(), 10);
      if (isNaN(num)) {
        throw new Error("");
      }
      return num;
    });
  } catch(e) {
    return undefined;
  }
}

const updateError = (name: string, msg?: string | null) => {
  const field = qs(`#${name}`);
  const errDest = qs(`.${name} .err`);

  if (field) {
    field.ariaInvalid = msg? "true" : null;
  }

  errDest?.replaceChildren(...(msg? [msg] : []));
  return !!msg;
}

qs(".copy-head-button")?.addEventListener("click", async e => {
  await navigator.clipboard.writeText(headHTML);
});

qs(".copy-body-button")?.addEventListener("click", async e => {
  await navigator.clipboard.writeText(
    bodyHTML?.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim()
    ||
    ""
  );
});

form?.addEventListener("submit", async (e) => {
  if (!form || !container || !code) {
    return;
  }
  e.preventDefault();
  const formData = new FormData(form);

  // Get user selections.
  const opt: Partial<CreateHTMLOptions> = {
    slug: (formData.get("slug") || undefined) as (string | undefined),
    suggestedAmounts: parseNumbers(formData?.get("amounts") as (string | null | undefined)),
    suggestedRecurringAmounts: parseNumbers(formData?.get("amounts-recurring") as (string | null | undefined)),
    doDedication: !!formData.get("dedication"),
    initialFrequency: (formData.get("init-freq") || undefined) as CreateHTMLOptions["initialFrequency"],
    startWithAmountSelected: !!formData.get("start-selected"),
    locale: "en-US",
    currencyCode: "USD",
  };

  // Validate user selections, abort if bad.
  let hasErr = false;
  
  hasErr = updateError("slug", opt.slug? "" :
    "Enter a donation page slug (my-nonprofit-inc)"
  ) || hasErr;
  hasErr = updateError("amounts", opt.suggestedAmounts? "" :
    "Enter no suggested amounts, or a list separated by commas (25, 50, 100)"
  ) || hasErr;
  hasErr = updateError("amounts-recurring", opt.suggestedRecurringAmounts? "" :
    "Enter no suggested recurring amounts, or a list separated by commas (25, 50, 100)"
  ) || hasErr;

  if (hasErr) {
    return;
  }

  // Handle custom colors, if enabled.
  let styleTag = "";
  if (!!formData.get("custom-colors")) {
    for(const colorField of ["fg","bg","accent"]) {
      const light = (formData.get(`color-${colorField}-light`) || "#000000") as string;
      let dark = (formData.get(`color-${colorField}-dark`) || undefined) as string | undefined;
      if (light === dark) {
        dark = undefined;
      }
      const color = dark? `light-dark(${light}, ${dark})` : light;
      styleTag += `  --gl-color-${colorField}: ${color};\n`;
    }

    styleTag = `<style>\n.gl-simple-donation-widget {\n${styleTag}}\n</style>\n`;
  }

  // Generate HTML and update the page.
  bodyHTML = styleTag + createHTML(opt as CreateHTMLOptions);
  container.innerHTML = bodyHTML;
  code.replaceChildren(bodyHTML);

  // Reload the runtime script, so that it can attach to the new elements.
  const scriptURL ="./gl-simple-runtime.min.js";
  qs(`script[src^="${scriptURL}"]`)?.remove();
  const script = document.createElement("script");
  script.src = scriptURL;
  document.body.appendChild(script);
});