import { handleOnPdf, handlePdf, SJGProductMappings } from './pdf-refs.js';
import { getBasicSetPDFSetting, isOpenFirstPDFSetting, registerPDFSettings } from './settings.js';
import { registerPDFSheet } from './sheet.js';
function init() {
    console.log('GURPS | Initializing GURPS PDF module.');
    GURPS.SJGProductMappings = SJGProductMappings;
    Hooks.once('init', () => {
        registerPDFSheet();
    });
    Hooks.once('ready', () => {
        registerPDFSettings();
    });
}
export const Pdf = {
    init,
    handlePdf,
    handleOnPdf,
    get isOpenFirstPDFSetting() {
        return isOpenFirstPDFSetting();
    },
    get basicSetPDFSetting() {
        return getBasicSetPDFSetting();
    },
};
