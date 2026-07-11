# give-lively-simple
Improved simple donation widget for [Give Lively](https://www.givelively.org/donation-widgets) **(NOT official)**. Uses semantic HTML/CSS with minimal vanilla JS for improved performance and accessibility.

## Try it out!
<https://gl-simple-demo.twilight-bread-fa09.workers.dev>

This is a quick & dirty demo page I wrote that lets you configure a donation widget and generate embeddable HTML for it. Feel free to use
it as much as you like, it runs entirely on the client side, and the static assets are hosted for free by Cloudflare. See [`/demo`](/demo)
for the source code.

## Motivation
Give Lively's existing simple donation widget is a nice way to allow donors to initiate a donation directly from your website. This
is important to improve donor conversion. However, the simple donation widget has a few drawbacks:

1. Separate suggested amounts for recurring donations and picking a different initial donation frequency are not yet implemented.

1. It is not accessible via keyboard - if you try to select one of the amount buttons, you can't then tab past the "custom amount"
   button without clearing your selection.

1. The form is very confusing when using a screen-reader - the buttons act like radio buttons in two separate groups,
   but they are not marked as radio buttons in the accessibility tree, and the groups are not present either.

1. Native, semantic html is not used for forms or form controls, leading to very inconsistent/inadequate accessibility behavior
   overall.

1. The widget is somewhat heavy, and cannot be embedded statically - so there's always a flash of unstyled content (FOUC) on load.
   Interactions like opening a dialog are laggy as well, enough to require a loading skeleton.

1. It cannot easily be styled using CSS to match the fonts and colors of the website, and it does not support dark mode.
   (A single brand color may be configured in the Give Lively admin portal, which does help somewhat)

## This Solution

1. Supports configuring separate suggested amounts for recurring donations, and the initial donation frequency.

1. Prefers native html elements (`<form>`, `<dialog>`, `<button>`, etc) for improved accessibility without needing to set
   a bunch of ARIA attributes manually. This helps with performance, too (espeically dialogs).

1. For performance, uses modern CSS features to minimize the amount of client-side javascript needed.

1. Amount and frequency buttons now use actual `<input type="radio">` elements, grouped inside `<fieldset>`, to enforce
   proper screen-reader and keyboard-interaction behavior.

1. No third-party web fonts are used by default, and no JS is used for element layout and styling. So even if the client-side
   javascript is loaded from a third-party source, you still won't get any flashes of unstyled content.

1. CSS variables are provided that can be easily overridden to style the widget, including font family, font size,
   and color (foreground, background, accent, focus ring, error). See top of [`gl-simple.css`](gl-simple.css) for the full
   list.

1. Dark-mode is supported via the color-scheme CSS property, if the user specifies each color using the
   `light-dark()` function.

> [!WARNING]
> `light-dark()` will not become baseline widely available until Nov. 2026 (see [CanIUse](https://caniuse.com/wf-light-dark))


## Project Structure

These are the three main files:
* [`gl-simple-builder.ts`](gl-simple-builder.ts) - provides function to generate HTML for a given donation widget configuration
* [`gl-simple-runtime.ts`](gl-simple-runtime.ts) - script that must be loaded alongside the html for the widget to work (doesn't depend on widget configuration)
* [`gl-simple.css`](gl-simple.css) - styles that must be loaded alongside the generated html for the widget to work (doesn't depend on widget configuration)

These files use modern features of HTML/CSS/JS, but align with the [Baseline Widely Available](https://web.dev/how-to-use-baseline)
standard to ensure broad browser compatibility. A few features that are not yet widely-available are used as progressive enhancements - these
are optional style or performance features that do not inhibit usability when missing.

Minified versions of these files can be found in [`dist/`](dist). They have no external dependencies, and are very lightweight:

|  File   | Minified | Gzipped  |
| ------- | -------- | -------- |
| builder |  9.91 kB |  3.15 kB |
| runtime |  5.86 kB |  2.38 kB |
| css     | 10.26 kB |  2.81 kB |


## Integration

### Via Generator Component

If you're generating your website using a framework like Astro or Hugo, you can build a component
that accepts the same options as the builder script, calls the builder script to generate the HTML,
and then embeds the HTML into a fragment or div.

See [`integrations/GiveLively.astro`](integrations/GiveLively.astro) for an example of how to do this.
If you're using Astro, you can just copy this file straight into your project, along with the three
main files described above (gl-simple-builder.ts, gl-simple-runtime.ts, and gl-simple.css), and it
will work out of the box, will full typescript support for the config options.

You can see an example of the Astro component being used [here](https://github.com/Christians-Concerned-for-the-Community/website-cccgainesville-org/blob/main/src/pages/give.astro), and you can see the produced page [here](https://staging.cccgainesville.org/give).

The builder exports a single function (`createHTML()`), that takes only one argument of type `CreateHTMLOptions`.
Thorough comments on each configuration option are provided at the top of [`gl-simple-builder.ts`](gl-simple-builder.ts).

### Via Direct HTML Edit

Use the [Demo](https://gl-simple-demo.twilight-bread-fa09.workers.dev) page to generate a widget
with your desired options, then scroll to the bottom to reveal the two "Copy" buttons.

Click "Copy head HTML", then paste the results into the `<head>` tag of the page. This will add
two `<link>` tags, one for the minified CSS file, and one for the minified runtime JS file.

Click "Copy body HTML", then paste the results into the `<body>` tag of the page, wherever you want
the donation widget to appear. This will add a single `<div>` with class `gl-simple-donation-widget`
that contains the entire widget.

If you're using a Wordpress theme or something similar that will only allow you to inject HTML into
the body, it's okay to paste the head HTML tags inside the body. Should still work, it's just a bit less efficient
for loading.

You can also use `<script>` and `<style>` tags to inline the necessary content instead, if you wish. You'll
need to manually copy the contents of [`dist/gl-simple-runtime.min.js`](dist/gl-simple-runtime.min.js) and
[`dist/gl-simple.min.css`](dist/gl-simple.min.css) into each tag, respectively.
