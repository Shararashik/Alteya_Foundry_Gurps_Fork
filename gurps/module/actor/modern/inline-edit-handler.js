export function shouldUpdateName(newName, currentName) {
    const trimmedName = newName.trim();
    return trimmedName.length > 0 && trimmedName !== currentName;
}
export function shouldUpdateField(newValue, currentValue) {
    const trimmedValue = newValue.trim();
    return trimmedValue !== (currentValue ?? '');
}
export function bindInlineEdit(html, config) {
    const { displaySelector, containerSelector, inputSelector, editingClass = 'editing', onBlur } = config;
    html.find(displaySelector).on('click', (event) => {
        event.preventDefault();
        const container = event.currentTarget.closest(containerSelector);
        container.classList.add(editingClass);
        const input = container.querySelector(inputSelector);
        if (input) {
            input.focus();
            input.select();
        }
    });
    html.find(inputSelector).on('blur', (event) => {
        const input = event.currentTarget;
        const container = input.closest(containerSelector);
        setTimeout(() => {
            if (!container.contains(document.activeElement)) {
                container.classList.remove(editingClass);
                onBlur?.(input);
            }
        }, 100);
    });
    html.find(inputSelector).on('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const input = event.currentTarget;
            const container = input.closest(containerSelector);
            container.classList.remove(editingClass);
            input.blur();
        }
    });
}
const inlineEditConfigs = [
    {
        displaySelector: '.ms-resource-display',
        containerSelector: '.ms-resource',
        inputSelector: '.ms-resource-input',
    },
    {
        displaySelector: '.ms-name-display',
        containerSelector: '.ms-name-container',
        inputSelector: '.ms-name-input',
        fieldType: 'name',
    },
    {
        displaySelector: '.ms-tag-display',
        containerSelector: '.ms-tag',
        inputSelector: '.ms-tag-input',
        fieldType: 'tag',
    },
    {
        displaySelector: '.ms-dr-display',
        containerSelector: '.ms-loc-dr',
        inputSelector: '.ms-dr-input',
    },
];
export function buildOnBlurHandler(config, actor) {
    if (config.fieldType === 'name') {
        return (input) => {
            const newName = input.value;
            if (shouldUpdateName(newName, actor.name)) {
                actor.update({ name: newName.trim() });
            }
        };
    }
    if (config.fieldType === 'tag') {
        return (input) => {
            const field = input.dataset.field;
            const newValue = input.value;
            if (field) {
                const currentValue = foundry.utils.getProperty(actor, field);
                if (shouldUpdateField(newValue, currentValue)) {
                    actor.update({ [field]: newValue.trim() });
                }
            }
        };
    }
    return undefined;
}
export function bindAllInlineEdits(html, actor) {
    inlineEditConfigs.forEach(config => {
        const onBlur = buildOnBlurHandler(config, actor);
        bindInlineEdit(html, { ...config, onBlur });
    });
}
export function bindAttributeEdit(html, actor) {
    const wrapperSelector = '.ms-attr-wrapper';
    const badgeSelector = '.ms-attr-badge';
    const inputSelector = '.ms-attr-input';
    const editButtonSelector = '.ms-attr-edit';
    const editingClass = 'editing';
    html.find(editButtonSelector).on('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const wrapper = event.currentTarget.closest(wrapperSelector);
        const badge = wrapper.querySelector(badgeSelector);
        badge.classList.add(editingClass);
        const input = badge.querySelector(inputSelector);
        if (input) {
            input.focus();
            input.select();
        }
    });
    html.find(badgeSelector).on('click', (event) => {
        const badge = event.currentTarget;
        if (badge.classList.contains(editingClass)) {
            event.stopPropagation();
        }
    });
    html.find(inputSelector).on('blur', (event) => {
        const input = event.currentTarget;
        const badge = input.closest(badgeSelector);
        badge.classList.remove(editingClass);
        const attrName = badge.dataset.attr;
        const fieldPath = `system.attributes.${attrName}.import`;
        const newValue = parseInt(input.value, 10);
        const currentValue = foundry.utils.getProperty(actor, fieldPath);
        if (!isNaN(newValue) && newValue !== currentValue) {
            actor.update({ [fieldPath]: newValue });
        }
    });
    html.find(inputSelector).on('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            const input = event.currentTarget;
            const badge = input.closest(badgeSelector);
            badge.classList.remove(editingClass);
            const attrName = badge.dataset.attr;
            const fieldPath = `system.attributes.${attrName}.import`;
            input.value = String(foundry.utils.getProperty(actor, fieldPath) ?? '');
            input.blur();
        }
    });
}
export function bindSecondaryStatsEdit(html, actor) {
    const fieldsetSelector = '.ms-editable-stats';
    const editButtonSelector = '.ms-stat-box-edit';
    const inputSelector = '.ms-stat-input';
    const editingClass = 'editing';
    html.find(editButtonSelector).on('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const fieldset = event.currentTarget.closest(fieldsetSelector);
        fieldset.classList.toggle(editingClass);
        if (fieldset.classList.contains(editingClass)) {
            const firstInput = fieldset.querySelector(inputSelector);
            if (firstInput) {
                firstInput.focus();
                firstInput.select();
            }
        }
    });
    html.find(`${fieldsetSelector} ${inputSelector}`).on('blur', (event) => {
        const input = event.currentTarget;
        const fieldset = input.closest(fieldsetSelector);
        setTimeout(() => {
            if (!fieldset.contains(document.activeElement)) {
                fieldset.classList.remove(editingClass);
                
				const fieldPath = input.name;
				
				if (fieldPath === 'system.thrust' || fieldPath === 'system.swing') {
				  // Content for these fields must be in the format xd+/-y, such as 2d+1 or 3d-2. Validate this before updating
				  // the actor.
				  const regex = /^\d+d([+-]\d+)?$/
				  if (!regex.test(input.value.trim())) {
					// If the input doesn't match the expected format, reset it to the current value and exit without updating
					// the actor.
					input.value = String(foundry.utils.getProperty(actor, fieldPath) ?? '')
					return
				  }

				  actor.update({ [fieldPath]: input.value.trim() })
				  return
				}
				
                const newValue = parseFloat(input.value);
                const currentValue = foundry.utils.getProperty(actor, fieldPath);
                if (!isNaN(newValue) && newValue !== currentValue) {
                    actor.update({ [fieldPath]: newValue });
                }
            }
        }, 100);
    });
    html.find(`${fieldsetSelector} ${inputSelector}`).on('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const input = event.currentTarget;
            input.blur();
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            const input = event.currentTarget;
            const fieldset = input.closest(fieldsetSelector);
            fieldset.classList.remove(editingClass);
            const fieldPath = input.name;
            input.value = String(foundry.utils.getProperty(actor, fieldPath) ?? '');
            input.blur();
        }
    });
}
export function bindPointsEdit(html, actor) {
    const itemSelector = '.ms-points-item';
    const inputSelector = '.ms-points-input';
    const editingClass = 'editing';
    html.find(itemSelector).on('click', (event) => {
        const item = event.currentTarget;
        if (item.classList.contains(editingClass))
            return;
        item.classList.add(editingClass);
        const input = item.querySelector(inputSelector);
        if (input) {
            input.focus();
            input.select();
        }
    });
    html.find(inputSelector).on('blur', (event) => {
        const input = event.currentTarget;
        const item = input.closest(itemSelector);
        item.classList.remove(editingClass);
        const fieldPath = input.name;
        const newValue = parseInt(input.value, 10);
        const currentValue = foundry.utils.getProperty(actor, fieldPath);
        if (!isNaN(newValue) && newValue !== currentValue) {
            actor.update({ [fieldPath]: newValue });
        }
    });
    html.find(inputSelector).on('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            const input = event.currentTarget;
            const item = input.closest(itemSelector);
            item.classList.remove(editingClass);
            const fieldPath = input.name;
            input.value = String(foundry.utils.getProperty(actor, fieldPath) ?? '');
            input.blur();
        }
    });
}
