async function GetNumberInput(options) {
    try {
        return await foundry.applications.api.DialogV2.prompt({
            window: { title: options.title },
            // COMPATIBILITY: Foundry v12 and earlier
            // content: await foundry.applications.handlebars.renderTemplate(
            content: await renderTemplate('systems/gurps/templates/ui/get-number-input.hbs', {
                headerText: options.headerText,
                promptText: options.promptText,
                label: options.label,
                value: options.value || 1,
                min: options.min || 1,
                max: options.max ?? 100,
                step: options.step ?? 1,
            }),
            ok: {
                label: options.okLabel || 'GURPS.submit',
                callback: (event, button, dialog) => button.form.elements.number.valueAsNumber,
            },
        });
    }
    catch (err) {
        console.error('GetNumberInput: failed to open or process number input dialog.', err);
        return options.value || 1;
    }
}
export { GetNumberInput };
