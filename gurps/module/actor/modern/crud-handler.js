export async function openItemSheetIfFoundryItem(actor, entityData) {
    if (!entityData?.itemid)
        return false;
    if (!(await actor._sanityCheckItemSettings(entityData)))
        return true;
    let item = actor.items.get(entityData.itemid);
    if (!item)
        return false;
    if (item.system?.fromItem) {
        item = actor.items.get(item.system.fromItem);
    }
    if (!item)
        return false;
    item.editingActor = actor;
    item.sheet?.render(true);
    return true;
}
export function buildEntityPath(basePath, key) {
    return `${basePath}.${key}`;
}
export function getDisplayName(obj, displayProperty, fallbackLocaleKey) {
    if (obj && typeof obj[displayProperty] === 'string') {
        return obj[displayProperty];
    }
    return game.i18n.localize(fallbackLocaleKey);
}
export async function confirmAndDelete(actor, key, displayName, fallbackLocaleKey) {
    const confirmed = await Dialog.confirm({
        title: game.i18n.localize('GURPS.delete'),
        content: `<p>${game.i18n.localize('GURPS.delete')}: <strong>${displayName || game.i18n.localize(fallbackLocaleKey)}</strong>?</p>`,
    });
    if (confirmed) {
        await actor.deleteEntry(key);
    }
    return confirmed ?? false;
}
export function bindCrudActions(html, actor, sheet, config) {
    const { entityName, path, EntityClass, editMethod, localeKey, displayProperty = 'name', createArgs } = config;
    html.find(`[data-action="add-${entityName}"]`).on('click', async (event) => {
        event.preventDefault();
        const newEntity = createArgs ? new EntityClass(...createArgs) : new EntityClass(game.i18n.localize(localeKey));
        const list = GURPS.decode(actor, path) || {};
        const key = GURPS.put(list, foundry.utils.duplicate(newEntity));
        await actor.internalUpdate({ [path]: list });
        const fullPath = buildEntityPath(path, key);
        const duplicatedEntity = foundry.utils.duplicate(GURPS.decode(actor, fullPath));
        await editMethod.call(sheet, actor, fullPath, duplicatedEntity);
    });
    html.find(`[data-action="edit-${entityName}"]`).on('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const target = event.currentTarget;
        const entityPath = target.dataset.key ?? '';
        const entityData = foundry.utils.duplicate(GURPS.decode(actor, entityPath));
        if (await openItemSheetIfFoundryItem(actor, entityData))
            return;
        await editMethod.call(sheet, actor, entityPath, entityData);
    });
    html.find(`[data-action="delete-${entityName}"]`).on('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const target = event.currentTarget;
        const entityKey = target.dataset.key ?? '';
        const entityData = GURPS.decode(actor, entityKey);
        const displayValue = displayProperty === 'name' ? entityData?.name : entityData?.notes;
        await confirmAndDelete(actor, entityKey, displayValue, localeKey);
    });
}
export function bindModifierCrudActions(html, actor, sheet, editMethod, isReaction) {
    const entityName = isReaction ? 'reaction' : 'conditional';
    const path = isReaction ? 'system.reactions' : 'system.conditionalmods';
    const localeKey = isReaction ? 'GURPS.reaction' : 'GURPS.conditionalModifier';
    html.find(`[data-action="add-${entityName}"]`).on('click', async (event) => {
        event.preventDefault();
        const { Reaction, Modifier } = await import('../actor-components.js');
        const ModifierClass = isReaction ? Reaction : Modifier;
        const newModifier = new ModifierClass('0', game.i18n.localize(localeKey));
        const list = GURPS.decode(actor, path) || {};
        const key = GURPS.put(list, foundry.utils.duplicate(newModifier));
        await actor.internalUpdate({ [path]: list });
        const fullPath = buildEntityPath(path, key);
        const duplicatedModifier = foundry.utils.duplicate(GURPS.decode(actor, fullPath));
        await editMethod.call(sheet, actor, fullPath, duplicatedModifier, isReaction);
    });
    html.find(`[data-action="edit-${entityName}"]`).on('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const target = event.currentTarget;
        const modifierPath = target.dataset.key ?? '';
        const modifierData = foundry.utils.duplicate(GURPS.decode(actor, modifierPath));
        await editMethod.call(sheet, actor, modifierPath, modifierData, isReaction);
    });
    html.find(`[data-action="delete-${entityName}"]`).on('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const target = event.currentTarget;
        const modifierKey = target.dataset.key ?? '';
        const modifierData = GURPS.decode(actor, modifierKey);
        await confirmAndDelete(actor, modifierKey, modifierData?.situation, localeKey);
    });
}
