import * as Settings from '../../../lib/miscellaneous-settings.js';
import { confirmAndDelete, openItemSheetIfFoundryItem } from "./crud-handler.js";
export function bindEquipmentCrudActions(html, actor, sheet) {
    const entityType = 'equipment';
    html.find(`[data-action="add-${entityType}"]`).on('click', async (event) => {
        event.preventDefault();
        const target = event.currentTarget;
        const container = target.dataset.container ?? '';
        const path = `system.equipment.${container}`;
        const { Equipment } = await import('../actor-components.js');
        const newEquipment = new Equipment(`${game.i18n.localize('GURPS.equipment')}...`, true);
        if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
            newEquipment.save = true;
            const payload = newEquipment.toItemData(actor, '');
            const [item] = await actor.createEmbeddedDocuments('Item', [payload]);
            newEquipment.itemid = item._id;
        }
        if (!newEquipment.uuid) {
            newEquipment.uuid = newEquipment._getGGAId({ name: newEquipment.name ?? '', type: container, generator: '' });
        }
        const list = GURPS.decode(actor, path) || {};
        GURPS.put(list, foundry.utils.duplicate(newEquipment));
        await actor.internalUpdate({ [path]: list });
    });
    html.find(`[data-action="edit-${entityType}"]`).on('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const target = event.currentTarget;
        const equipmentPath = target.dataset.key ?? '';
        const equipmentData = foundry.utils.duplicate(GURPS.decode(actor, equipmentPath));
        if (await openItemSheetIfFoundryItem(actor, equipmentData))
            return;
        await sheet.editEquipment(actor, equipmentPath, equipmentData);
    });
    html.find(`[data-action="delete-${entityType}"]`).on('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const target = event.currentTarget;
        const equipmentKey = target.dataset.key ?? '';
        const equipmentData = GURPS.decode(actor, equipmentKey);
        await confirmAndDelete(actor, equipmentKey, equipmentData?.name, 'GURPS.equipment');
    });
}
export function bindNoteCrudActions(html, actor, sheet) {
    const entityType = 'note';
    const path = 'system.notes';
    html.find(`[data-action="add-${entityType}"]`).on('click', async (event) => {
        event.preventDefault();
        const { Note } = await import('../actor-components.js');
        const list = foundry.utils.duplicate(foundry.utils.getProperty(actor, path)) || {};
        const newNote = new Note('', true);
        const dialogContent = await renderTemplate('systems/gurps/templates/note-editor-popup.hbs', newNote);
        new Dialog({
            title: 'Note Editor',
            content: dialogContent,
            buttons: {
                one: {
                    label: 'Create',
                    callback: async (dialogHtml) => {
                        newNote.notes = dialogHtml.find('.notes').val();
                        newNote.title = dialogHtml.find('.title').val();
                        GURPS.put(list, newNote);
                        await actor.internalUpdate({ [path]: list });
                    },
                },
            },
            default: 'one',
        }).render(true);
    });
    html.find(`[data-action="edit-${entityType}"]`).on('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const target = event.currentTarget;
        const notePath = target.dataset.key ?? '';
        const noteData = foundry.utils.duplicate(GURPS.decode(actor, notePath));
        await sheet.editNotes(actor, notePath, noteData);
    });
    html.find(`[data-action="delete-${entityType}"]`).on('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const target = event.currentTarget;
        const noteKey = target.dataset.key ?? '';
        const noteData = GURPS.decode(actor, noteKey);
        await confirmAndDelete(actor, noteKey, noteData?.notes, 'GURPS.notes');
    });
}
export function bindTrackerActions(html, actor) {
    html.find('[data-action="add-tracker"]').on('click', (event) => {
        event.preventDefault();
        actor.addTracker();
    });
}
