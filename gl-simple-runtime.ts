(() => {
  const MIN_DONATION = 5;
  const MAX_DONATION = 100000;
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // Shortcuts for querySelector calls (mostly nice just to prevent having to write as HTMLElement | null endlessly in Typescript).
  const qs = (target: ParentNode | HTMLElement | null | undefined, query: string) => target?.querySelector(query) as HTMLElement | null;
  const qsroot = (query: string) => qs(document, `.gl-simple-donation-widget ${query}`)

  // Polyfills and bugfixes for native dialogs. -----
  const donateModal = qsroot(".gl-donate-modal") as HTMLDialogElement | null;
  const dedModal = qsroot(".gl-ded-modal") as HTMLDialogElement | null;

  //    <dialog> closedBy attribute not yet newly available (still in TP on Safari).
  const supports_closedby = (document.createElement("dialog") as any).closedBy === "none";
  //    Invoker Commands API is supported everywhere in baseline Dec 2025.
  const supports_invoker = (Object.hasOwn(HTMLButtonElement.prototype, 'command'));
  //    Safari has some bugs of its own.
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  let closeDialog = (dialog: HTMLDialogElement | null) => dialog?.close();
  if (!supports_invoker || !supports_closedby || isSafari) {
    [donateModal, dedModal].forEach(dialog => {
      if (isSafari) {
        // Safari closes the dialog immediately, even if there are still CSS transitions pending.
        // To fix exit transition animation, trigger them with an extra class, then only close the
        // dialog once the transition is done.
        closeDialog = (dialog: HTMLDialogElement | null) => {
          // Add listener for end of closing animation, that actually closes the dialog.
          dialog?.addEventListener("transitionend", () => {
            dialog.close();
            dialog.classList.remove("gl-is-closing");
          }, { once: true });
          // Trigger closing animation.
          dialog?.classList.add("gl-is-closing");
        };
        
        // Intercept escape key, back button, or requestClose(), and use our custom closeDialog function
        // instead.
        dialog?.addEventListener("cancel", (e) => {
          e.preventDefault();
          closeDialog(dialog);
        });

        // Unhide an empty div with tabindex=-1 and autofocus at the top of the dialog. This prevents
        // Safari from showing a focus outline around the first focusable element when the dialog opens.
        qs(dialog, "[autofocus]")?.toggleAttribute("hidden", false);
      }

      if (!supports_closedby) {
        // Support "light dismiss" of modal (clicking outside it), if closedby attribute isn't available.
        dialog?.addEventListener('click', (e) => {
          const edges = dialog.getBoundingClientRect();
          if (e.clientX < edges.left || e.clientX > edges.right ||
              e.clientY < edges.top  || e.clientY > edges.bottom) {
            e.preventDefault();
            closeDialog(dialog);
          }
        });
      }

      if (!supports_invoker && dialog?.id) {
        // Manually add event listeners to open and close buttons, if Invoker API isn't supported.
        const invokers = document.querySelectorAll(`.gl-simple-donation-widget [commandfor="${dialog.id}"]`);
        for (const invoker of invokers) {
          const command = invoker.getAttribute("command");
          invoker.removeAttribute("command");
          invoker.removeAttribute("commandfor");
          if (command === "show-modal") {
            invoker.ariaHasPopup = "dialog";
            invoker.addEventListener("click", () => dialog.showModal());
          } else if (command == "request-close") {
            invoker.addEventListener("click", () => closeDialog(dialog));
          }
        }
      }
    });
  } // END polyfills and bugfixes for dialogs -----

  const donateForm = qsroot("> form") as HTMLFormElement;

  const customInput = qs(donateForm, ".gl-amount > label input") as HTMLInputElement | null;
  const freqSet = qs(donateForm, "fieldset.gl-frequency");
  const amountSet = qs(donateForm, ".gl-amount fieldset");
  const amountErr = qs(donateForm, ".gl-amount span[aria-live]");

  const firstOnetime = qs(amountSet, ".gl-amt-value-onetime input") as HTMLInputElement | null;
  const firstRecurring = qs(amountSet, ".gl-amt-value-recurring input") as HTMLInputElement | null;

  const donateSuffix = qs(donateForm, ".gl-donate-suffix");
  const donateSuffixAlt = qs(donateForm, ".gl-donate-suffix-alt");
  
  const dedButton = qs(donateForm, ".gl-ded-button");

  const iframe = qs(donateModal, "iframe") as HTMLIFrameElement | null;

  const dedForm = qs(dedModal, "form") as HTMLFormElement | null;

  const dedNameInput = qs(dedForm, ".gl-ded-name input");
  const dedNameErr = qs(dedForm, ".gl-ded-name span[aria-live]");
  const dedEmailInput = qs(dedForm, ".gl-ded-email input");
  const dedEmailErr = qs(dedForm, ".gl-ded-email span[aria-live]");

  if (!customInput || !amountErr || !donateSuffix || !donateSuffixAlt || !donateModal || !iframe) {
    return;
  }

  let dedData: Record<string, any> | undefined; // submitted data from Dedication modal will be passed in this var.

  const iframeUrl = new URL(`https://secure.givelively.org/donate/${donateForm.dataset.slug}`);
  const thisUrl = new URL(document.URL);

  const locale = donateForm.dataset.locale || "en-US";
  const settings: Intl.NumberFormatOptions = {
    style: "currency",
    currency: donateForm.dataset.currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  };
  const currencyFormatter = Intl.NumberFormat(locale, settings);
  const currencyNameFormatter = Intl.NumberFormat(locale, {
    ...settings,
    currencyDisplay: "name"
  });

  // Helper utils.
  const updateError = (errDest?: HTMLElement | null, culprit?: HTMLElement | null, msg?: string | null): boolean => {
    errDest?.replaceChildren(...(msg? [msg] : []));
    if (culprit) {
      culprit.ariaInvalid = msg? "true" : null;
      culprit.ariaDescribedByElements = msg && errDest? [errDest] : null;
    }
    /* Returns true if there was an error message to add, false if the message was empty (everything OK). */
    return !!msg;
  }

  const updateDonateButton = (): void => {
    // Update donate button label based on currently selected amount and frequency.
    const formData = new FormData(donateForm);
    const [amountStr] = getAmountDigits(formData);

    const freq = (formData.get("frequency") === "monthly")? " Monthly" : "";

    donateSuffix.replaceChildren(...(
      amountStr? [currencyFormatter.format(amountStr as unknown as number) + freq] : []
    ));

    donateSuffixAlt.replaceChildren(...(
      amountStr? [currencyNameFormatter.format(amountStr as unknown as number) + freq] : []
    ));
  };

  const getAmountDigits = (formData: FormData): [string | null | undefined, boolean] => {
    const buttonSelection = formData.get("amount") as string | null;
    const customInput = formData.get("otherAmount") as string | null;
    const ret: [string | null | undefined, boolean] = (!amountSet || buttonSelection === "other")?
      [customInput, true] : [buttonSelection, false];
    ret[0] = ret[0]?.replace(/\D/g, "");
    return ret;
  };

  // When any fields in the form are modified: update submit button text to reflect chosen donation amount
  donateForm.addEventListener('input', () => updateDonateButton());

  // When the frequency button selection is changed, and there are separate button sets for onetime vs
  // recurring, choose the first element in the new set that just got revealed:
  if (firstOnetime && firstRecurring) {
    freqSet?.addEventListener("change", (e) => {
      const btn = (e.target as HTMLInputElement).value === "one-time"? firstOnetime : firstRecurring;
      btn.checked = true;
      btn.dispatchEvent(new Event('change', {bubbles: true}));
      donateForm.dispatchEvent(new Event("input", {bubbles: true}));
    });
  }

  // When the amount button selection is changed:
  amountSet?.addEventListener("change", () => {
    // Clear all current amount errors.
    updateError(amountErr, amountSet);
    updateError(amountErr, customInput);
  });

  // When the custom amount is edited:
  customInput.addEventListener('input', () => {
    // Reformat number for current locale as currency, but remove the currency symbol (since it's already included in prefix).
    if (customInput.value) {
      const digits = customInput.value.replace(/\D/g, "");
      customInput.value = digits?
        currencyFormatter.formatToParts(digits as unknown as number)
          .flatMap((part) => part.type === "currency"? [] : [part.value]).join("").trim()
        :
        ""
      ;
    }
  });
  customInput.addEventListener('beforeinput', (e) => {
    // Prevent user from manually entering any non-digit characters.
    if (e.data && /\D/g.test(e.data)) {
      e.preventDefault();
    }
  });

  // When the iframe sends out a message:
  window.addEventListener('message', (e: MessageEvent) => {
    if (e.origin !== iframeUrl.origin) return; //make sure messages are coming from givelively's origin, for security

    const message = ((typeof e.data === "object")?
      (e.data?.message || JSON.stringify(e.data))
      :
      String(e.data)
    ).toLowerCase();

    // Reset the form if the user's donation succeeded.
    if (message.includes("gl_checkout_complete")) {
      donateForm.reset();
      updateDonateButton(); // needed because events aren't fired when form values are changed programmatically.
    }

    // Close the modal window if the user asked the iframe to close.
    if (message === "close_modal" && donateModal?.open) {
      closeDialog(donateModal);
    }
  });

  // When iframe is successfully loaded:
  iframe.addEventListener('load', () => {
    if (iframe.src && iframe.src !== "about:blank") {
      donateModal.toggleAttribute("data-loaded", true);
    }
  });

  // When donation modal is closed:
  donateModal.addEventListener("close", () => {
    // Clear out the iframe.
    iframe.setAttribute("src", "about:blank");
    donateModal.toggleAttribute("data-loaded", false);
  });

  // When remove button is clicked on dedication modal:
  qs(dedForm, ".gl-ded-remove")?.addEventListener("click", () => {
    // Clear out dedication data. 
    dedData = undefined;
    dedForm?.reset();
    // Clear errors.
    updateError(dedNameErr, dedNameInput);
    updateError(dedEmailErr, dedEmailInput);
    // Reset to "no dedication" state.
    if (dedButton) {
      dedButton.dataset.state = "new";
    }
    // Go back to donation form.
    closeDialog(dedModal);
  });

  // When dedication form is submitted:
  dedForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!dedButton || !dedNameErr || !dedEmailErr) {
      return;
    }

    // Get user selections.
    const formData = new FormData(dedForm);

    dedData = {
      type: (formData.get("ded_type") as string | null),
      name: (formData.get("ded_name") as string | null)?.trim(),
      email: (formData.get("ded_email") as string | null)?.trim()
    };

    // Validate user selections.
    if(
      updateError(dedNameErr, dedNameInput, dedData.name? "" :
        "Enter the dedicatee's name (John Smith)"
      )
      ||
      updateError(dedEmailErr, dedEmailInput, !dedData.email || EMAIL_REGEX.test(dedData.email)? "" :
        "Enter a valid email (jsmith@example.com)"
      )
    ) {
      dedButton.dataset.state = "new";
      dedData = undefined;
    } else {
      dedButton.dataset.state = "edit";
      closeDialog(dedModal);
    }
  });

  // When donate form is submitted:
  donateForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get user selections from form.
    const donateFormData = new FormData(donateForm);

    const frequency = donateFormData.get("frequency") as string | null;

    const [amountStr, isCustom] = getAmountDigits(donateFormData);
    const amount = Number(amountStr) || 0;

    // Validate user selections.
    let errMsg;
    if (!isCustom && amount == 0) {
      errMsg = "Select a donation amount.";
    } else if (amount < MIN_DONATION) {
      errMsg = `Enter a donation of ${currencyFormatter.format(MIN_DONATION)} or more.`;
    } else if (amount > MAX_DONATION) {
      errMsg = `Enter a donation of ${currencyFormatter.format(MAX_DONATION)} or less.`;
    }
    if (updateError(amountErr, (isCustom? customInput : amountSet), errMsg)) { // clears err state if errMsg is falsy
      return;
    }

    // Construct query params to pass to the iframe.
    const params = new URLSearchParams({
      recurring: String(frequency === "monthly"),
      override_amount: amountStr || "",
      dedication_name: dedData?.name || "",
      dedication_email: dedData?.email || "",
      dedication_type: dedData?.type || "",
      widget_type: "simple_donation",
      widget_url: thisUrl.origin + thisUrl.pathname,
      isWixEmbedded: "false",
    });
    if (document.referrer) {
      params.set("referrer_url", document.referrer);
    }
    const utm_source = new URLSearchParams(thisUrl.search).get("utm_source");
    if (utm_source) {
      params.set("utm_source", utm_source);
    }

    // Set the iframe URL. Show modal window immediately.
    iframeUrl.search = params.toString();
    iframe.setAttribute("src", iframeUrl.toString());
    donateModal.showModal();
  });
})();