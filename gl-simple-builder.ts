/**
 * gl-simple-builder
 * 
 * Exports:
 *   [function] createHTML(opt: CreateHTMLOptions)
 *   [type] CreateHTMLOptions
 * 
 * Script that accepts configuration options, and returns a string containing
 * the static HTML of a donation widget.
 * 
 * This script has no dependencies (pure vanilla TS), and can be run either on
 * the browser or on server-side environments.
 * 
 * The widget's HTML will require the following two files to be embedded or imported
 * into the final page in order to work properly (see dist/ directory):
 *   gl-simple.min.css
 *   gl-simple-runtime.min.js
 * 
 * A minimized and transpiled version of this file is also included in dist/, if
 * you want to use it client-side. 
 */
  
export interface CreateHTMLOptions {
  /**
   * The slug that identifies the nonprofit giving page you wish to target.
   * 
   * If you want the donation widget to point at a campaign page, the slug can
   * include that too.
   * 
   * For example, an org named "My Nifty Nonprofit, Inc." might have the following
   * URL when logging into Give Lively:
   *    secure.givelively.org/nonprofits/my-nifty-nonprofit-inc
   * 
   * Their main giving page would be at:
   *    secure.givelively.org/donate/my-nifty-nonprofit-inc
   * 
   * In this case, you'd want to set the slug to:
   *    my-nifty-nonprofit-inc
   * 
   * If you wanted to target the "BFF Forever" campaign page here:
   *    secure.givelively.org/donate/my-nifty-nonprofit-inc/bff-forever
   * 
   * You'd set the slug like to this instead:
   *    my-nifty-nonprofit-inc/bff-forever
   */
  slug: string,

  /**
   * What amounts to suggest to the donor (must be whole numbers).
   * 
   * If not provided, an empty input box will be shown for the donor to type
   * their amount into.
   * 
   * If only one suggested amount is provided, the input box will be preset
   * to the given amount on load.
   * 
   * If more than one suggested amount is provided, an individual radio button
   * will be shown for each option, as well as a "Custom Amount" option that
   * shows the input box when clicked.
   * 
   * Default: no suggested amounts
   */
  suggestedAmounts?: number[],

  /**
   * What amounts to suggest to the donor for recurring donations, if you wish
   * those amounts to be different (must be whole numbers).
   * 
   * If not provided, will just use the same suggestedAmounts as non-recurring.
   * 
   * If suggestedAmounts or suggestedRecurringAmounts has less than two elements, this is
   * ignored - it only applies in cases where a set of amount buttons are provided
   * above the input.
   * 
   * Default: same suggested amounts as non-recurring
   */
  suggestedRecurringAmounts?: number[],

  /**
   * Whether or not to let donors dedicate their gifts.
   * 
   * This places an extra button above submit that shows the dedication dialog
   * when clicked.
   * 
   * Default: false
   */
  doDedication?: boolean,

  /**
   * Locale to use for formatting strings.
   * 
   * Default: the locale of the server ("en-US", "de-DE", etc.)
   */
  locale?: string,

  /**
   * Currency code of the currency that donations will be made in.
   * 
   * Default: "USD"
   */
  currencyCode?: string,

  /**
   * Any extra classes you want to add to the donation widget container.
   */
  class?: string,

  /**
   * Label to apply to the form for screen readers. Don't include the word "form",
   * screen readers will already say that in addition to the name.
   * 
   * @default "Secure Donation"
   */
  ariaLabel?: string,
};

// Utils and info for the selected currency and locale.
type CurrencyFormat = {
  withSymbol: Intl.NumberFormat,
  withName: Intl.NumberFormat
  symbol: string,
  namePlural: string,
}
const getCurrencyFormat = (iopt: CreateHTMLOptions): CurrencyFormat => {
  const settings: Intl.NumberFormatOptions = {
    style: "currency",
    currency: iopt.currencyCode,
    // Don't include decimal field (only show whole numbers)
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  };
  const withSymbol = Intl.NumberFormat(iopt.locale, settings);
  const withName = Intl.NumberFormat(iopt.locale, {
    ...settings,
    currencyDisplay: "name"
  });

  return {
    withSymbol: withSymbol,
    withName: withName,
    symbol: withSymbol.formatToParts(2).find(part => part.type === "currency")?.value || "$",
    namePlural: withName.formatToParts(2).find(part => part.type == "currency")?.value || "US dollars",
  };
}


const attr = (name: string, value?: string | boolean | null): string => {
  if (!value) {
    return "";
  }
  if (typeof value === "boolean") {
    return name;
  }
  return `${name}="${value}"`;
};

const makeFrequencyRadios = (): string => {
  const frequencyButtons = [
    { title: "One-Time", value: "one-time", id: "gl-freq-onetime" },
    { title: "Monthly",  value: "monthly",  id: "gl-freq-monthly", className: "gl-freq-recurring" }
  ];

  return frequencyButtons.map((freq, idx) => `
      <label ${attr("for", freq.id)} ${attr("class", freq.className)}>
        <input type="radio" ${attr("id", freq.id)} name="frequency" ${attr("value", freq.value)} ${attr("checked", idx===0)}/>
        ${freq.title}
      </label>`
  ).join("\n");
};

const makeAmountRadios = (iopt: CreateHTMLOptions, curr: CurrencyFormat): string => {
  const separateRecurring = iopt.suggestedRecurringAmounts && iopt.suggestedRecurringAmounts.length > 1;

  // Make a list of button definitions. If we have separate recurring buttons, they'll be added too,
  // but will be assigned a different CSS class so they can be toggled on/off separately from the
  // non-recurring ones.
  type amountButton = {
    title: string,
    alt: string,
    value: string,
    id: string,
    className?: string
  };
  const amountButtons = iopt.suggestedAmounts?.map((amount) : amountButton => { return {
    title: curr.withSymbol.format(amount),
    alt: curr.withName.format(amount),
    value: String(Math.ceil(amount)),
    id: "gl-amt-" + amount,
    className: separateRecurring? "gl-amt-value-onetime" : undefined,
  }}) || [];
  if (separateRecurring) {
    iopt.suggestedRecurringAmounts?.forEach(amount => amountButtons?.push({
      title: curr.withSymbol.format(amount),
      alt: curr.withName.format(amount),
      value: String(Math.ceil(amount)),
      id: "gl-amt-recurring" + amount,
      className: "gl-amt-value-recurring",
    }));
  }

  return amountButtons.map((amt) => `
        <label ${attr("for", amt.id)} ${attr("class", amt.className)}>
          <input type="radio" ${attr("id", amt.id)} name="amount" ${attr("value", amt.value)}/>
          <span aria-hidden="true">${amt.title}</span>
          <span class="sr-only">${amt.alt}</span>
        </label>`
  ).join("\n") + `

        <label for="gl-amt-other">
          <input type="radio" id="gl-amt-other" name="amount" value="other"/>
          Custom Amount
        </label>`
  ;
};

const makeAmountField = (iopt: CreateHTMLOptions, curr: CurrencyFormat): string => {
  const ret: string[] = [];

  // Add amount buttons with default values, if there are at least two suggested options.
  const hasButtons = iopt.suggestedAmounts && iopt.suggestedAmounts.length > 1;
  if (hasButtons) {
    ret.push(
      `<fieldset class="gl-focus-container">
        <legend class="sr-only">Donation Amount</legend>
        ${makeAmountRadios(iopt, curr)}
      </fieldset>`
    );
  }

  // If there's only on suggested value, prefill the amount input box with it.
  let defaultValue;
  if (iopt.suggestedAmounts?.length === 1) {
    defaultValue = String(iopt.suggestedAmounts[0]);
  }

  // Add the input box that lets users enter a custom donation amount.
  ret.push(`
      <label for="gl-other-input" class="gl-other-input">
        <span class="gl-other-label-1 sr-only">Custom amount in ${curr.namePlural}</span>
        <div class="gl-other-label-2">
          <span>Donation amount<span class="sr-only"> in ${curr.namePlural}</span>
        </div>
        <div class="gl-focus-container">
          <span aria-hidden="true">${curr.symbol}</span>
          <input type="text" id="gl-other-input" inputmode="numeric" name="otherAmount" required ${attr("value", defaultValue)} />
          <span aria-hidden="true">${iopt.currencyCode}</span>
        </div>
      </label>`
  );

  // Add the div used to report any errors that occur with the amount field.
  // Alert triangle icon obtained from here: https://tabler.io/icons?icon=alert-triangle
  ret.push(`
      <div class="gl-err">
        <svg aria-hidden="true">
          <symbol id="gl-icon-warning" viewBox="0 0 24 24">
            <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 9v4" />
              <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0" />
              <path d="M12 16h.01" />
            </g>
          </symbol>
          <use href="#gl-icon-warning"/>
        </svg>
        <span class="gl-amount-err" aria-live="polite"></span>
      </div>`
  );

  return ret.join("\n");
};

const makeDonateButton = (iopt: CreateHTMLOptions, curr: CurrencyFormat): string => {
  // If suggested amounts is exactly one, we have a prefilled amount, and we need
  // to prepopulate the button with the correct suffix text to match.
  // (If we did this in the client Javascript instead, we'd have a layout shift during loading)
  let defaultSuffix="", defaultSuffixAlt="";
  if (iopt.suggestedAmounts?.length === 1) {
    defaultSuffix = curr.withSymbol.format(iopt.suggestedAmounts[0]);
    defaultSuffixAlt = curr.withName.format(iopt.suggestedAmounts[0]);
  }

  return `
    <button type="submit" class="gl-primary">
      <span aria-hidden="true">Donate <span class="gl-donate-suffix">${defaultSuffix}</span></span>
      <span class="sr-only">Donate <span class="gl-donate-suffix-alt">${defaultSuffixAlt}</span></span>
    </button>`
  ;
};

const makeDedicationButton = (iopt: CreateHTMLOptions): string => {
  if (!iopt.doDedication) {
    return "";
  }
  // Heart icon obtained from here: https://tabler.io/icons?icon=heart
  return `
    <button type="button" class="gl-ded-button gl-secondary" data-state="new" commandfor="gl-ded-modal" command="show-modal">
      <svg aria-hidden="true" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path d="M6.979 3.074a6 6 0 0 1 4.988 1.425l.037 .033l.034 -.03a6 6 0 0 1 4.733 -1.44l.246 .036a6 6 0 0 1 3.364 10.008l-.18 .185l-.048 .041l-7.45 7.379a1 1 0 0 1 -1.313 .082l-.094 -.082l-7.493 -7.422a6 6 0 0 1 3.176 -10.215z" />
      </svg>
      <span class="gl-ded-button-new">Dedicate This Gift</span>
      <span class="gl-ded-button-edit">Edit Dedication</span>
    </button>`
  ;
};

const makeDedicationTypeRadios = (): string => {
  const dedicationButtons = [
    { title: "In Honor Of",  value: "InHonorOfDedication",  id: "gl-ded-honor" },
    { title: "In Memory Of", value: "InMemoryOfDedication", id: "gl-ded-memory" },
  ];

  return dedicationButtons.map((ded, idx) => `
        <label ${attr("for",ded.id)}>
          <input type="radio" ${attr("id", ded.id)} name="ded_type" ${attr("value",ded.value)} ${attr("checked", idx === 0)}/>
          ${ded.title}
        </label>`
  ).join("\n");
};

const makeDedicationModal = (iopt: CreateHTMLOptions): string => {
  if (!iopt.doDedication) {
    return "";
  }

  const ariaLabel = "Dedication";

  /*
    Have to set various ignore attributes on each text input to prevent Bitwarden
    and other password managers from attempting autofill - they can sometimes crash
    JS on forms that are located inside native dialogs, due to browser security
    preventing DOM modifications.
     (This is on the password manager authors, it's a silly bug)
   */
  const pmInputAttrs = [
    attr("data-lpignore", "true"),
    attr("data-1p-ignore", true),
    attr("data-bwignore", "true"),
    attr("data-protonpass-ignore", "true"),
    attr("data-dashlane-disabled-on-field", "true"),
  ].join(" ");
  const pmFormAttrs = [
    attr("data-keeper-lock", "true"),
  ].join(" ");

  /*
    Explanation for the hidden div with tabindex=-1 at the top of the dialog:

    This is a workaround to fix a 4 year old bug in Safari, where it triggers
    :focus-visible on modal dialog open when the keyboard was not used to trigger
    the modal button.

    The hidden attribute will be removed via Javascript if it detects we're on Safari.

    Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=247416
   */

  return `
  <dialog id="gl-ded-modal" class="gl-ded-modal" closedby="any" aria-label="Edit Gift Dedication">
    <div tabindex="-1" autofocus class="sr-only" hidden></div>

    <button type="button" class="gl-close" commandfor="gl-ded-modal" command="request-close">
      <svg aria-hidden="true" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6l-12 12" /><path d="M6 6l12 12" />
      </svg>
      <span class="sr-only">Close</span>
    </button>

    <form novalidate ${attr("aria-label", ariaLabel)} ${pmFormAttrs}>
      <fieldset class="gl-focus-container">
        <legend class="sr-only">Dedication Type</legend>
        ${makeDedicationTypeRadios()}
      </fieldset>

      <div class="gl-err-group gl-ded-name">
        <label for="gl-ded-name">
          Dedicatee's Name
          <span aria-hidden="true" class="gl-required"> (required)</span>
          <input type="text" id="gl-ded-name" name="ded_name" required
            autocomplete="name" spellcheck="false" autocapitalize="words" autocorrect="off" maxlength="255"
            ${pmInputAttrs}
          />
        </label>

        <div class="gl-err">
          <svg aria-hidden="true"><use href="#gl-icon-warning"/></svg>
          <span class="gl-ded-name-err" aria-live="polite"></span>
        </div>
      </div>

      <div class="gl-err-group gl-ded-email">
        <label for="gl-ded-email">
          Recipient Email
          <input type="email" id="gl-ded-email" name="ded_email" required autocomplete="email" maxlength="255"
            ${pmInputAttrs}
          />
          <div>
            Notify someone about your gift. The email will identify you as the donor, but does not
            specify the amount of your gift.
          </div>
        </label>

        <div class="gl-err">
          <svg aria-hidden="true"><use href="#gl-icon-warning"/></svg>
          <span class="gl-ded-email-err" aria-live="polite"></span>
        </div>
      </div>

      <button type="button" class="gl-ded-remove gl-secondary">Remove<span class="sr-only"> Dedication and Close</span></button>

      <button type="submit" class="gl-ded-save gl-primary">Save<span class="sr-only"> Dedication and Close</span></button>
    </form>
  </dialog>`
  ;
};

const makeDonateModal = (): string => {
  return `
  <dialog class="gl-donate-modal" closedby="any" aria-label="Donate using Give Lively">
    <svg stroke="currentColor" viewBox="0 0 24 24" class="gl-spinner">
      <g><circle cx="12" cy="12" r="9.5" fill="none" stroke-width="2"/></g>
    </svg>
    <iframe allow="payment" src="about:blank"></iframe>
  </dialog>`
  ;
};



export const createHTML = (opt: CreateHTMLOptions): string => {
  const iopt = { ...opt };

  // Set defaults for optional params.
  iopt.currencyCode ||= "USD";
  iopt.locale ||= new Intl.DateTimeFormat().resolvedOptions().locale;
  iopt.ariaLabel ||= "Secure Donation";

  // Set up currency formatting for chosen code and locale.
  const curr = getCurrencyFormat(iopt);

  return `\
<div ${attr("class","gl-simple-donation-widget" + (iopt.class? " " + iopt.class : ""))}>
  <form novalidate
    ${attr("data-slug", iopt.slug)}
    ${attr("data-locale", iopt.locale)}
    ${attr("data-currency", iopt.currencyCode)}
    ${attr("aria-label", iopt.ariaLabel)}
  >
    <fieldset class="gl-focus-container gl-frequency">
      <legend class="sr-only">Donation Frequency</legend>
      ${makeFrequencyRadios()}
    </fieldset>

    <div class="gl-err-group gl-amount">
      ${makeAmountField(iopt, curr)}
    </div>

    ${makeDedicationButton(iopt)}
    ${makeDonateButton(iopt, curr)}
  </form>\

  ${makeDedicationModal(iopt)}
  ${makeDonateModal()}
</div>
` ;
};