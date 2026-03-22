import { MODULE_NAME, SETTING_BASICSET_PDF, SETTING_PDF_OPEN_FIRST } from './types.js';
export function registerPDFSettings() {
    if (!game.settings || !game.i18n)
        throw new Error('GURPS | PDF module requires game.settings and game.i18n to be available!');
    // Register the old settings for migration purposes.
    game.settings.register(GURPS.SYSTEM_NAME, 'basicsetpdf', {
        name: game.i18n.localize('GURPS.settingBasicPDFs'),
        hint: game.i18n.localize('GURPS.settingHintBasicPDFs'),
        scope: 'world',
        config: false,
        type: String,
        // @ts-expect-error: choices may not be typed in Foundry's API
        choices: {
            Combined: game.i18n.localize('GURPS.settingBasicPDFsCombined'),
            Separate: game.i18n.localize('GURPS.settingBasicPDFsSeparate'),
        },
        default: 'Combined',
        onChange: value => console.log(`Basic Set PDFs : ${value}`),
    });
    game.settings.register(GURPS.SYSTEM_NAME, 'pdf-open-first', {
        name: game.i18n.localize('GURPS.settingPDFOpenFirst'),
        hint: game.i18n.localize('GURPS.settingHintPDFOpenFirst'),
        scope: 'world',
        config: false,
        type: Boolean,
        default: false,
        onChange: value => console.log(`On multiple Page Refs open first PDF found : ${value}`),
    });
    // Register the new settings for the PDF module.
    // Support for combined or separate Basic Set PDFs
    game.settings.register(GURPS.SYSTEM_NAME, SETTING_BASICSET_PDF, {
        name: game.i18n.localize('GURPS.settingBasicPDFs'),
        hint: game.i18n.localize('GURPS.settingHintBasicPDFs'),
        scope: 'world',
        config: false,
        type: String,
        // @ts-expect-error: choices may not be typed in Foundry's API
        choices: {
            Combined: game.i18n.localize('GURPS.settingBasicPDFsCombined'),
            Separate: game.i18n.localize('GURPS.settingBasicPDFsSeparate'),
        },
        default: game.settings.get(GURPS.SYSTEM_NAME, 'basicsetpdf') ?? 'Combined', // Migrate old setting if needed
        onChange: value => console.log(`Basic Set PDFs : ${value}`),
    });
    game.settings.register(GURPS.SYSTEM_NAME, SETTING_PDF_OPEN_FIRST, {
        name: game.i18n.localize('GURPS.settingPDFOpenFirst'),
        hint: game.i18n.localize('GURPS.settingHintPDFOpenFirst'),
        scope: 'world',
        config: false,
        type: Boolean,
        default: game.settings.get(GURPS.SYSTEM_NAME, 'pdf-open-first') ?? false, // Migrate old setting if needed
        onChange: value => console.log(`On multiple Page Refs open first PDF found : ${value}`),
    });
    game.settings.registerMenu(GURPS.SYSTEM_NAME, MODULE_NAME, {
        name: game.i18n.localize('GURPS.pdf.settingsName'),
        hint: game.i18n.localize('GURPS.pdf.settingsHint'),
        label: game.i18n.localize('GURPS.pdf.settingsButton'),
        type: PDFSettingsApplication,
        restricted: false,
        icon: 'fa-solid fa-file-pdf',
    });
}
export function isOpenFirstPDFSetting() {
    return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_PDF_OPEN_FIRST) ?? false;
}
export function getBasicSetPDFSetting() {
    return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_BASICSET_PDF);
}
class PDFSettingsApplication extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    static DEFAULT_OPTIONS = {
        tag: 'form',
        id: 'pdf-settings',
        window: {
            classes: ['standard-form'],
            title: game.i18n?.localize('GURPS.pdf.settingsButton') ?? '',
        },
        position: {
            width: 400,
        },
        form: {
            handler: PDFSettingsApplication.#onSubmit,
            closeOnSubmit: true,
        },
    };
    static PARTS = {
        main: {
            template: 'systems/gurps/templates/pdf/settings.hbs',
        },
        footer: {
            template: 'templates/generic/form-footer.hbs',
        },
    };
    get title() {
        return game.i18n.localize(this.options.window.title);
    }
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        return foundry.utils.mergeObject(context, {
            pdfOpenFirstSetting: game.settings.get(GURPS.SYSTEM_NAME, SETTING_PDF_OPEN_FIRST),
            basicSetPdfSetting: game.settings.get(GURPS.SYSTEM_NAME, SETTING_BASICSET_PDF),
            basicSetPdfChoices: {
                Combined: game.i18n.localize('GURPS.settingBasicPDFsCombined'),
                Separate: game.i18n.localize('GURPS.settingBasicPDFsSeparate'),
            },
            buttons: [{ type: 'submit', icon: 'fa-solid fa-save', label: 'SETTINGS.Save' }],
        });
    }
    static async #onSubmit(event, form, formData) {
        // @ts-expect-error: formData.object.basicSetPdfSetting may not be typed in Foundry's API
        await game.settings.set(GURPS.SYSTEM_NAME, SETTING_BASICSET_PDF, formData.object.basicSetPdfSetting);
        // @ts-expect-error: formData.object.pdfOpenFirstSetting may not be typed in Foundry's API
        await game.settings.set(GURPS.SYSTEM_NAME, SETTING_PDF_OPEN_FIRST, formData.object.pdfOpenFirstSetting);
    }
}
