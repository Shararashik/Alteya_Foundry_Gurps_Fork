export function bindDropdownToggle(html, config) {
    const { dropdownSelector, toggleSelector, optionSelector, onSelect } = config;
    html.find(toggleSelector).on('click', (event) => {
        event.stopPropagation();
        const dropdown = event.currentTarget.closest(dropdownSelector);
        dropdown.classList.toggle('open');
    });
    html.find(optionSelector).on('click', async (event) => {
        event.stopPropagation();
        const target = event.currentTarget;
        const value = target.dataset.value ?? '';
        const dropdown = target.closest(dropdownSelector);
        dropdown.classList.remove('open');
        await onSelect(value);
    });
    html.on('click', (event) => {
        const dropdown = html.find(`${dropdownSelector}.open`)[0];
        if (dropdown && !dropdown.contains(event.target)) {
            dropdown.classList.remove('open');
        }
    });
}
